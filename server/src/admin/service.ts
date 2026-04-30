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
 *   - photos_fts (contentless FTS5 — uses the special 'delete-all' command)
 *   - all photo-keyed social tables (reactions, comments, people-tag links,
 *     photo follows, notifications, on-this-day dismissals)
 *   - on-disk preview + thumbnail caches
 *
 * Preserves: users, people_tag definitions, activity history.
 */
function clearLibraryDerivedState(): void {
  const sqlite = getSqlite();
  sqlite.exec(`
    DELETE FROM photo_people_tags;
    DELETE FROM reactions;
    DELETE FROM comments;
    DELETE FROM photo_follows;
    DELETE FROM notifications;
    DELETE FROM dismissed_on_this_day;
    DELETE FROM photos;
    DELETE FROM folders;
    INSERT INTO photos_fts(photos_fts) VALUES('delete-all');
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
