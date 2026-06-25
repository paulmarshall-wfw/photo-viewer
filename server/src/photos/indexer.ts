import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { SUPPORTED_EXTENSIONS } from '@photo-viewer/shared';
import type { ImageFormat } from '@photo-viewer/shared';
import { getDb, getSqlite } from '../db/connection.js';
import { folders, photos } from '../db/schema.js';
import { readBasicExif } from '../metadata/exif-reader.js';
import { readXmp } from '../metadata/xmp.js';
import { getPhotosPath } from '../admin/service.js';
import { generateThumbnailFromPsd, generatePreviewFromPsd } from '../images/preview-generator.js';
import { hasCachedThumbnail, hasCachedPreview, getThumbnailPath, getPreviewPath } from '../images/cache.js';

export interface IndexProgress {
  phase: 'scanning' | 'indexing' | 'previews' | 'complete' | 'error';
  scannedFolders: number;
  scannedFiles: number;
  indexedFiles: number;
  totalFiles: number;
  previewsTotal: number;
  previewsDone: number;
  error?: string;
}

export interface RunIndexOptions {
  includeSubfolders?: boolean;
}

let indexing = false;
let progress: IndexProgress = {
  phase: 'complete',
  scannedFolders: 0,
  scannedFiles: 0,
  indexedFiles: 0,
  totalFiles: 0,
  previewsTotal: 0,
  previewsDone: 0,
};

export function getIndexProgress(): IndexProgress {
  return { ...progress };
}

export function isIndexing(): boolean {
  return indexing;
}

export function validateIndexTarget(folderRelativePath?: string): string | undefined {
  const photosPath = getPhotosPath();
  if (!photosPath || !fs.existsSync(photosPath)) {
    throw new Error('Photos path not configured or does not exist');
  }

  const rootPath = path.resolve(photosPath);
  const scanRoot = folderRelativePath
    ? path.resolve(rootPath, folderRelativePath)
    : rootPath;

  if (scanRoot !== rootPath && !scanRoot.startsWith(`${rootPath}${path.sep}`)) {
    throw new Error('Folder must be inside the configured photo library');
  }

  if (!fs.existsSync(scanRoot)) {
    throw new Error('Folder does not exist');
  }

  return folderRelativePath ? path.relative(rootPath, scanRoot) : undefined;
}

export async function runIndex(folderRelativePath?: string, options: RunIndexOptions = {}): Promise<void> {
  if (indexing) return;

  const photosPath = getPhotosPath();
  if (!photosPath || !fs.existsSync(photosPath)) {
    throw new Error('Photos path not configured or does not exist');
  }

  indexing = true;
  progress = { phase: 'scanning', scannedFolders: 0, scannedFiles: 0, indexedFiles: 0, totalFiles: 0, previewsTotal: 0, previewsDone: 0 };

  try {
    // Determine scan root: specific folder or entire collection
    const rootPath = path.resolve(photosPath);
    const scanRoot = folderRelativePath
      ? path.resolve(rootPath, folderRelativePath)
      : rootPath;
    const normalizedFolderRelativePath = validateIndexTarget(folderRelativePath);

    // Phase 1: Scan filesystem. Folder indexing is shallow unless requested as a subtree.
    // The library root follows the same rule so the UI can offer distinct root actions.
    const includeSubtree = options.includeSubfolders === true;
    if (includeSubtree) progress.scannedFolders = 1;
    const entries = !includeSubtree
      ? await scanSingleFolder(rootPath, scanRoot)
      : await scanDirectory(rootPath, scanRoot);

    progress.totalFiles = entries.files.length;
    progress.phase = 'indexing';

    const db = getDb();
    const now = new Date().toISOString();

    if (!normalizedFolderRelativePath) {
      // Full index: upsert root folder
      db.insert(folders)
        .values({ id: nanoid(), path: '', name: path.basename(photosPath), parentPath: null, photoCount: 0, indexedAt: now })
        .onConflictDoUpdate({ target: folders.path, set: { name: path.basename(photosPath), indexedAt: now } })
        .run();
    } else {
      const parentPath = path.dirname(normalizedFolderRelativePath);
      db.insert(folders)
        .values({
          id: nanoid(),
          path: normalizedFolderRelativePath,
          name: path.basename(scanRoot),
          parentPath: parentPath === '.' ? null : parentPath,
          photoCount: 0,
          indexedAt: now,
        })
        .onConflictDoUpdate({
          target: folders.path,
          set: {
            name: path.basename(scanRoot),
            parentPath: parentPath === '.' ? null : parentPath,
            indexedAt: now,
          },
        })
        .run();
    }

    // Upsert all folders found
    for (const folderEntry of entries.folders) {
      db.insert(folders)
        .values({ id: nanoid(), path: folderEntry.relativePath, name: folderEntry.name, parentPath: folderEntry.parentPath, photoCount: 0, indexedAt: now })
        .onConflictDoUpdate({ target: folders.path, set: { name: folderEntry.name, parentPath: folderEntry.parentPath, indexedAt: now } })
        .run();
    }

    // Index photos
    for (const fileEntry of entries.files) {
      const existing = db.select().from(photos).where(eq(photos.filePath, fileEntry.relativePath)).get();

      // Skip if file hasn't changed
      if (existing && existing.fileModifiedAt === fileEntry.mtime) {
        progress.indexedFiles++;
        continue;
      }

      // Read EXIF data
      const absolutePath = path.join(photosPath, fileEntry.relativePath);
      const exif = await readBasicExif(absolutePath);

      // Check for story sidecar
      const storyPath = absolutePath + '.story.md';
      const hasStory = fs.existsSync(storyPath);

      // Read XMP sidecar metadata (title/caption/date overrides)
      const xmp = readXmp(absolutePath);
      const xmpTitle = xmp.title;
      const xmpCaption = xmp.caption;
      const xmpDateTaken = xmp.dateTaken;

      const photoData = {
        folderPath: fileEntry.folderPath,
        filename: fileEntry.name,
        filePath: fileEntry.relativePath,
        fileSize: fileEntry.size,
        fileModifiedAt: fileEntry.mtime,
        format: fileEntry.format,
        width: exif.width,
        height: exif.height,
        title: xmpTitle || exif.title,
        caption: xmpCaption || exif.caption,
        dateTaken: xmpDateTaken || exif.dateTaken,
        hasStory,
        indexedAt: now,
      };

      if (existing) {
        db.update(photos).set(photoData).where(eq(photos.id, existing.id)).run();
      } else {
        db.insert(photos).values({ id: nanoid(), ...photoData }).run();
      }

      progress.indexedFiles++;
    }

    // Clean up deleted files within the same scope that was scanned.
    if (!normalizedFolderRelativePath && includeSubtree) {
      cleanupDeleted(entries.files.map(f => f.relativePath), entries.folders.map(f => f.relativePath));
    } else if (normalizedFolderRelativePath && includeSubtree) {
      cleanupDeletedInFolderTree(
        normalizedFolderRelativePath,
        entries.files.map(f => f.relativePath),
        entries.folders.map(f => f.relativePath),
      );
    } else {
      // For single-folder index, only clean up files in that folder
      cleanupDeletedInFolder(normalizedFolderRelativePath ?? '', entries.files.map(f => f.relativePath));
    }

    // Update derived data after cleanup so counts and search do not keep deleted rows.
    updateFolderStats();
    rebuildFtsIndex();

    // Generate previews for PSD/PSB files that don't have one yet
    const indexedFileSet = new Set(entries.files.map(f => f.relativePath));
    const psdPhotos = db.select({ id: photos.id, filePath: photos.filePath, filename: photos.filename })
      .from(photos)
      .where(eq(photos.format, 'psd'))
      .all()
      .filter(p => indexedFileSet.has(p.filePath))
      .filter(p => !hasCachedPreview(p.id) || !hasCachedThumbnail(p.id));

    if (psdPhotos.length > 0) {
      progress.phase = 'previews';
      progress.previewsTotal = psdPhotos.length;
      progress.previewsDone = 0;

      for (const photo of psdPhotos) {
        const absolutePath = path.join(photosPath, photo.filePath);
        try {
          if (!hasCachedThumbnail(photo.id)) {
            await generateThumbnailFromPsd(absolutePath, photo.id);
            db.update(photos)
              .set({ hasThumbnail: true, thumbnailPath: getThumbnailPath(photo.id) })
              .where(eq(photos.id, photo.id))
              .run();
          }
          if (!hasCachedPreview(photo.id)) {
            await generatePreviewFromPsd(absolutePath, photo.id);
            db.update(photos)
              .set({ hasPreview: true, previewPath: getPreviewPath(photo.id) })
              .where(eq(photos.id, photo.id))
              .run();
          }
        } catch {
          // Non-fatal — preview will fall back to on-demand generation
        }
        progress.previewsDone++;
      }
    }

    progress.phase = 'complete';
  } catch (err) {
    progress = {
      ...progress,
      phase: 'error',
      error: err instanceof Error ? err.message : 'Indexing failed',
    };
    throw err;
  } finally {
    indexing = false;
  }
}

interface ScanResult {
  folders: { relativePath: string; name: string; parentPath: string | null }[];
  files: { relativePath: string; name: string; folderPath: string; format: ImageFormat; size: number; mtime: string }[];
}

async function scanSingleFolder(rootPath: string, folderPath: string): Promise<ScanResult> {
  const result: ScanResult = { folders: [], files: [] };
  const relativeFolderPath = path.relative(rootPath, folderPath);

  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const absolutePath = path.join(folderPath, entry.name);

    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const format = SUPPORTED_EXTENSIONS[ext];
      if (format) {
        const stat = fs.statSync(absolutePath);
        const relativePath = path.relative(rootPath, absolutePath);
        result.files.push({
          relativePath,
          name: entry.name,
          folderPath: relativeFolderPath || '',
          format,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
        });
        progress.scannedFiles++;
      }
    }
  }

  progress.scannedFolders = 1;
  return result;
}

async function scanDirectory(rootPath: string, currentPath: string): Promise<ScanResult> {
  const result: ScanResult = { folders: [], files: [] };

  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // Skip hidden files/folders

    const absolutePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, absolutePath);

    if (entry.isDirectory()) {
      const parentRelative = path.relative(rootPath, currentPath);
      result.folders.push({
        relativePath,
        name: entry.name,
        parentPath: parentRelative || null,
      });
      progress.scannedFolders++;

      const subResult = await scanDirectory(rootPath, absolutePath);
      result.folders.push(...subResult.folders);
      result.files.push(...subResult.files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const format = SUPPORTED_EXTENSIONS[ext];
      if (format) {
        const stat = fs.statSync(absolutePath);
        const folderRelative = path.relative(rootPath, currentPath);
        result.files.push({
          relativePath,
          name: entry.name,
          folderPath: folderRelative || '',
          format,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
        });
        progress.scannedFiles++;
      }
    }
  }

  return result;
}

function updateFolderStats() {
  const db = getDb();
  const sqlite = db.$client as any;

  // Update photo counts
  sqlite.exec(`
    UPDATE folders SET photo_count = (
      SELECT COUNT(*) FROM photos WHERE photos.folder_path = folders.path
    )
  `);

  // Update first photo ID
  sqlite.exec(`
    UPDATE folders SET first_photo_id = (
      SELECT id FROM photos WHERE photos.folder_path = folders.path ORDER BY date_taken ASC, filename ASC LIMIT 1
    )
  `);
}

function rebuildFtsIndex() {
  const sqlite = getSqlite();

  // Drop and recreate the FTS table since it's an external-content table
  // with columns that don't exist in the photos table (story_text, folder_name)
  sqlite.exec(`DROP TABLE IF EXISTS photos_fts`);
  sqlite.exec(`
    CREATE VIRTUAL TABLE photos_fts USING fts5(
      title, caption, story_text, folder_name, filename,
      content='',
      content_rowid='rowid'
    )
  `);

  // Populate with data from photos + folders
  sqlite.exec(`
    INSERT INTO photos_fts(rowid, title, caption, story_text, folder_name, filename)
    SELECT p.rowid, COALESCE(p.title, ''), COALESCE(p.caption, ''), '', COALESCE(f.name, ''), p.filename
    FROM photos p
    LEFT JOIN folders f ON p.folder_path = f.path
  `);
}

function cleanupDeletedInFolder(folderPath: string, currentFiles: string[]) {
  const db = getDb();
  const folderPhotos = db.select({ id: photos.id, filePath: photos.filePath })
    .from(photos)
    .where(eq(photos.folderPath, folderPath))
    .all();
  const currentFileSet = new Set(currentFiles);

  for (const photo of folderPhotos) {
    if (!currentFileSet.has(photo.filePath)) {
      deletePhotoIndexRow(photo.id);
    }
  }
}

function cleanupDeletedInFolderTree(folderPath: string, currentFiles: string[], currentFolders: string[]) {
  const db = getDb();
  const scopedPhotos = db.select({ id: photos.id, filePath: photos.filePath, folderPath: photos.folderPath })
    .from(photos)
    .all()
    .filter(photo => isSameFolderOrDescendant(photo.folderPath, folderPath));
  const currentFileSet = new Set(currentFiles);

  for (const photo of scopedPhotos) {
    if (!currentFileSet.has(photo.filePath)) {
      deletePhotoIndexRow(photo.id);
    }
  }

  const currentFolderSet = new Set([folderPath, ...currentFolders]);
  const scopedFolders = db.select({ id: folders.id, path: folders.path })
    .from(folders)
    .all()
    .filter(folder => isSameFolderOrDescendant(folder.path, folderPath));

  for (const folder of scopedFolders) {
    if (!currentFolderSet.has(folder.path)) {
      deleteFolderIndexRow(folder.path);
    }
  }
}

function cleanupDeleted(currentFiles: string[], currentFolders: string[]) {
  const db = getDb();
  const allPhotos = db.select({ id: photos.id, filePath: photos.filePath }).from(photos).all();
  const currentFileSet = new Set(currentFiles);

  for (const photo of allPhotos) {
    if (!currentFileSet.has(photo.filePath)) {
      deletePhotoIndexRow(photo.id);
    }
  }

  const allFolders = db.select({ id: folders.id, path: folders.path }).from(folders).all();
  const currentFolderSet = new Set(['', ...currentFolders]);

  for (const folder of allFolders) {
    if (!currentFolderSet.has(folder.path)) {
      deleteFolderIndexRow(folder.path);
    }
  }
}

function isSameFolderOrDescendant(candidatePath: string, folderPath: string): boolean {
  return candidatePath === folderPath || candidatePath.startsWith(`${folderPath}/`);
}

function deletePhotoIndexRow(photoId: string) {
  const sqlite = getSqlite();
  sqlite.prepare(`DELETE FROM photo_people_tags WHERE photo_id = ?`).run(photoId);
  sqlite.prepare(`DELETE FROM reactions WHERE photo_id = ?`).run(photoId);
  sqlite.prepare(`DELETE FROM comments WHERE photo_id = ?`).run(photoId);
  sqlite.prepare(`DELETE FROM photo_follows WHERE photo_id = ?`).run(photoId);
  sqlite.prepare(`DELETE FROM notifications WHERE photo_id = ?`).run(photoId);
  sqlite.prepare(`DELETE FROM activity WHERE photo_id = ?`).run(photoId);
  sqlite.prepare(`DELETE FROM album_photos WHERE photo_id = ?`).run(photoId);
  sqlite.prepare(`DELETE FROM album_photo_exclusions WHERE photo_id = ?`).run(photoId);
  sqlite.prepare(`DELETE FROM photos WHERE id = ?`).run(photoId);
}

function deleteFolderIndexRow(folderPath: string) {
  const sqlite = getSqlite();
  sqlite.prepare(`DELETE FROM album_folders WHERE folder_path = ?`).run(folderPath);
  sqlite.prepare(`DELETE FROM folders WHERE path = ?`).run(folderPath);
}
