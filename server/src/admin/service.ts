import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { getDb, getSqlite } from '../db/connection.js';
import { configTable } from '../db/schema.js';

export function getConfig(key: string): string | null {
  const db = getDb();
  const row = db.select().from(configTable).where(eq(configTable.key, key)).get();
  return row?.value ?? null;
}

export function setConfig(key: string, value: string): void {
  const db = getDb();
  db.insert(configTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: configTable.key, set: { value } })
    .run();
}

export function isSetupComplete(): boolean {
  return getConfig('setup_complete') === 'true';
}

export function getPhotosPath(): string | null {
  return getConfig('photos_path');
}

/**
 * Set the photos path. If the path is changing from a previously-set value,
 * also wipe everything keyed to the old library so the gallery returns to a
 * "blank until re-indexed" state. Initial setup (previous == null) is a no-op
 * for the wipe — the tables are already empty.
 */
export function setPhotosPath(photosPath: string): void {
  const previous = getPhotosPath();
  setConfig('photos_path', photosPath);
  if (previous && previous !== photosPath) {
    clearLibraryDerivedState();
  }
}

/**
 * Wipe everything that was derived from the *previous* photo library:
 *   - photos and folders
 *   - photos_fts
 *   - all photo-keyed social tables (reactions, comments, people-tag links,
 *     photo follows, notifications, activity, on-this-day dismissals)
 *   - album folder/photo membership rows that reference indexed folders/photos
 *   - on-disk preview + thumbnail caches
 *
 * Preserves: users, people_tag definitions, album shells.
 */
export function clearLibraryDerivedState(): void {
  const sqlite = getSqlite();
  sqlite.exec(`
    DELETE FROM album_photo_exclusions;
    DELETE FROM album_photos;
    DELETE FROM album_folders;
    DELETE FROM photo_people_tags;
    DELETE FROM reactions;
    DELETE FROM comments;
    DELETE FROM photo_follows;
    DELETE FROM notifications;
    DELETE FROM dismissed_on_this_day;
    DELETE FROM activity;
    DELETE FROM photos;
    DELETE FROM folders;
    DROP TABLE IF EXISTS photos_fts;
    CREATE VIRTUAL TABLE photos_fts USING fts5(
      title, caption, story_text, folder_name, filename,
      content='',
      content_rowid='rowid'
    );
  `);

  // Wipe on-disk caches; ignore failures (best-effort cleanup).
  for (const dir of [config.previewsDir, config.thumbnailsDir]) {
    try {
      if (fs.existsSync(dir)) {
        for (const entry of fs.readdirSync(dir)) {
          fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
        }
      }
    } catch {
      // Cache cleanup is best-effort. Stale cache files are harmless —
      // they'll be overwritten or orphaned but won't be served (no DB row).
    }
  }
}
