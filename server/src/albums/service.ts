import { nanoid } from 'nanoid';
import type {
  Album,
  AlbumDetail,
  AlbumFolder,
  AlbumMembership,
  AlbumSummary,
  AlbumVisibility,
  CreateAlbumRequest,
  Photo,
  UpdateAlbumRequest,
} from '@photo-viewer/shared';
import { getSqlite } from '../db/connection.js';
import type { users } from '../db/schema.js';

type CurrentUser = typeof users.$inferSelect;

export function isAlbumVisibility(value: unknown): value is AlbumVisibility {
  return value === 'private' || value === 'shared';
}

function canEditAlbum(row: any, user: CurrentUser) {
  return user.role === 'admin' || row.owner_user_id === user.id;
}

function canReadAlbum(row: any, user: CurrentUser) {
  return row.visibility === 'shared' || canEditAlbum(row, user);
}

function normalizeName(name: unknown) {
  return typeof name === 'string' ? name.trim() : '';
}

function rowToPhoto(r: any): Photo {
  return {
    id: r.id,
    folderPath: r.folder_path,
    filename: r.filename,
    filePath: r.file_path,
    fileSize: r.file_size,
    fileModifiedAt: r.file_modified_at,
    format: r.format,
    width: r.width,
    height: r.height,
    title: r.title,
    caption: r.caption,
    dateTaken: r.date_taken,
    hasStory: !!r.has_story,
    hasThumbnail: !!r.has_thumbnail,
    hasPreview: !!r.has_preview,
    location: r.location,
    indexedAt: r.indexed_at,
    reactionCount: r.reaction_count ?? 0,
    commentCount: r.comment_count ?? 0,
  };
}

function rowToAlbum(row: any, user: CurrentUser): Album {
  return {
    id: row.id,
    name: row.name,
    visibility: row.visibility,
    ownerUserId: row.owner_user_id,
    ownerDisplayName: row.owner_display_name || row.owner_email || 'Unknown',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canEdit: canEditAlbum(row, user),
  };
}

function rowToSummary(row: any, user: CurrentUser): AlbumSummary {
  return {
    ...rowToAlbum(row, user),
    folderCount: row.folder_count ?? 0,
    explicitPhotoCount: row.explicit_photo_count ?? 0,
    resolvedPhotoCount: row.resolved_photo_count ?? 0,
  };
}

function albumSummarySelect(whereClause: string) {
  return `
    SELECT a.*,
           COALESCE(u.display_name, u.email) AS owner_display_name,
           u.email AS owner_email,
           (SELECT COUNT(*) FROM album_folders af WHERE af.album_id = a.id) AS folder_count,
           (SELECT COUNT(*) FROM album_photos ap WHERE ap.album_id = a.id) AS explicit_photo_count,
           (
             SELECT COUNT(*)
             FROM (
               SELECT ap.photo_id AS id FROM album_photos ap WHERE ap.album_id = a.id
               UNION
               SELECT p.id AS id
               FROM album_folders af
               INNER JOIN photos p ON p.folder_path = af.folder_path
               WHERE af.album_id = a.id
             )
           ) AS resolved_photo_count
    FROM albums a
    LEFT JOIN users u ON u.id = a.owner_user_id
    ${whereClause}
    ORDER BY a.updated_at DESC, a.name ASC
  `;
}

export function listAlbums(user: CurrentUser): AlbumSummary[] {
  const sqlite = getSqlite();
  const rows = sqlite.prepare(albumSummarySelect(`
    WHERE a.visibility = 'shared' OR a.owner_user_id = ? OR ? = 'admin'
  `)).all(user.id, user.role) as any[];
  return rows.map((row) => rowToSummary(row, user));
}

export function listEditableAlbumMembership(user: CurrentUser, item: { photoId?: string; folderPath?: string }): AlbumMembership[] {
  const sqlite = getSqlite();
  const rows = sqlite.prepare(albumSummarySelect(`
    WHERE a.owner_user_id = ? OR ? = 'admin'
  `)).all(user.id, user.role) as any[];

  const checkedIds = new Set<string>();
  if (item.photoId) {
    const checked = sqlite.prepare(`
      SELECT album_id FROM album_photos WHERE photo_id = ?
    `).all(item.photoId) as any[];
    checked.forEach((row) => checkedIds.add(row.album_id));
  } else if (item.folderPath) {
    const checked = sqlite.prepare(`
      SELECT album_id FROM album_folders WHERE folder_path = ?
    `).all(item.folderPath) as any[];
    checked.forEach((row) => checkedIds.add(row.album_id));
  }

  return rows.map((row) => ({
    album: rowToSummary(row, user),
    checked: checkedIds.has(row.id),
  }));
}

export function createAlbum(user: CurrentUser, request: CreateAlbumRequest): AlbumSummary | { error: string } {
  const name = normalizeName(request.name);
  if (!name) return { error: 'Album name required' };
  if (name.length > 120) return { error: 'Album name must be 120 characters or less' };

  const visibility = request.visibility ?? 'private';
  if (!isAlbumVisibility(visibility)) return { error: 'Invalid album visibility' };

  const sqlite = getSqlite();
  const id = nanoid();
  const now = new Date().toISOString();
  sqlite.prepare(`
    INSERT INTO albums (id, name, visibility, owner_user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, visibility, user.id, now, now);

  return getAlbumSummary(id, user)!;
}

export function getAlbumSummary(albumId: string, user: CurrentUser): AlbumSummary | null {
  const sqlite = getSqlite();
  const row = sqlite.prepare(`${albumSummarySelect('WHERE a.id = ?')} LIMIT 1`).get(albumId) as any;
  if (!row || !canReadAlbum(row, user)) return null;
  return rowToSummary(row, user);
}

export function getAlbumDetail(albumId: string, user: CurrentUser): AlbumDetail | null {
  const sqlite = getSqlite();
  const summary = getAlbumSummary(albumId, user);
  if (!summary) return null;

  const folderRows = sqlite.prepare(`
    SELECT af.album_id, af.folder_path, af.added_by_user_id, af.added_at,
           f.name AS folder_name,
           f.photo_count AS folder_photo_count
    FROM album_folders af
    LEFT JOIN folders f ON f.path = af.folder_path
    WHERE af.album_id = ?
    ORDER BY COALESCE(f.name, af.folder_path) ASC
  `).all(albumId) as any[];

  const folders: AlbumFolder[] = folderRows.map((row) => ({
    albumId: row.album_id,
    folderPath: row.folder_path,
    folderName: row.folder_name,
    photoCount: row.folder_photo_count ?? 0,
    addedByUserId: row.added_by_user_id,
    addedAt: row.added_at,
  }));

  const explicitRows = sqlite.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM reactions r WHERE r.photo_id = p.id) AS reaction_count,
      (SELECT COUNT(*) FROM comments c WHERE c.photo_id = p.id) AS comment_count
    FROM album_photos ap
    INNER JOIN photos p ON p.id = ap.photo_id
    WHERE ap.album_id = ?
    ORDER BY p.date_taken DESC, p.filename ASC
  `).all(albumId) as any[];

  const resolvedRows = sqlite.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM reactions r WHERE r.photo_id = p.id) AS reaction_count,
      (SELECT COUNT(*) FROM comments c WHERE c.photo_id = p.id) AS comment_count
    FROM photos p
    WHERE p.id IN (
      SELECT ap.photo_id AS id FROM album_photos ap WHERE ap.album_id = ?
      UNION
      SELECT pf.id AS id
      FROM album_folders af
      INNER JOIN photos pf ON pf.folder_path = af.folder_path
      WHERE af.album_id = ?
    )
    ORDER BY p.date_taken DESC, p.filename ASC
  `).all(albumId, albumId) as any[];

  return {
    ...summary,
    folders,
    explicitPhotos: explicitRows.map(rowToPhoto),
    photos: resolvedRows.map(rowToPhoto),
  };
}

export function updateAlbum(albumId: string, user: CurrentUser, request: UpdateAlbumRequest): AlbumSummary | { error: string; status: number } {
  const sqlite = getSqlite();
  const row = sqlite.prepare(`SELECT * FROM albums WHERE id = ?`).get(albumId) as any;
  if (!row) return { error: 'Album not found', status: 404 };
  if (!canEditAlbum(row, user)) return { error: 'Forbidden', status: 403 };

  const nextName = request.name === undefined ? row.name : normalizeName(request.name);
  if (!nextName) return { error: 'Album name required', status: 400 };
  if (nextName.length > 120) return { error: 'Album name must be 120 characters or less', status: 400 };

  const nextVisibility = request.visibility === undefined ? row.visibility : request.visibility;
  if (!isAlbumVisibility(nextVisibility)) return { error: 'Invalid album visibility', status: 400 };

  sqlite.prepare(`
    UPDATE albums SET name = ?, visibility = ?, updated_at = ? WHERE id = ?
  `).run(nextName, nextVisibility, new Date().toISOString(), albumId);

  return getAlbumSummary(albumId, user)!;
}

export function deleteAlbum(albumId: string, user: CurrentUser): { success: true } | { error: string; status: number } {
  const sqlite = getSqlite();
  const row = sqlite.prepare(`SELECT * FROM albums WHERE id = ?`).get(albumId) as any;
  if (!row) return { error: 'Album not found', status: 404 };
  if (!canEditAlbum(row, user)) return { error: 'Forbidden', status: 403 };

  sqlite.prepare(`DELETE FROM album_folders WHERE album_id = ?`).run(albumId);
  sqlite.prepare(`DELETE FROM album_photos WHERE album_id = ?`).run(albumId);
  sqlite.prepare(`DELETE FROM albums WHERE id = ?`).run(albumId);
  return { success: true };
}

export function addFolderToAlbum(albumId: string, folderPath: string, user: CurrentUser) {
  const sqlite = getSqlite();
  const row = sqlite.prepare(`SELECT * FROM albums WHERE id = ?`).get(albumId) as any;
  if (!row) return { error: 'Album not found', status: 404 };
  if (!canEditAlbum(row, user)) return { error: 'Forbidden', status: 403 };

  const folder = sqlite.prepare(`SELECT path FROM folders WHERE path = ?`).get(folderPath);
  if (!folder) return { error: 'Folder not found', status: 404 };

  const now = new Date().toISOString();
  sqlite.prepare(`
    INSERT OR IGNORE INTO album_folders (album_id, folder_path, added_by_user_id, added_at)
    VALUES (?, ?, ?, ?)
  `).run(albumId, folderPath, user.id, now);
  sqlite.prepare(`UPDATE albums SET updated_at = ? WHERE id = ?`).run(now, albumId);
  return { success: true };
}

export function removeFolderFromAlbum(albumId: string, folderPath: string, user: CurrentUser) {
  const sqlite = getSqlite();
  const row = sqlite.prepare(`SELECT * FROM albums WHERE id = ?`).get(albumId) as any;
  if (!row) return { error: 'Album not found', status: 404 };
  if (!canEditAlbum(row, user)) return { error: 'Forbidden', status: 403 };

  sqlite.prepare(`DELETE FROM album_folders WHERE album_id = ? AND folder_path = ?`).run(albumId, folderPath);
  sqlite.prepare(`UPDATE albums SET updated_at = ? WHERE id = ?`).run(new Date().toISOString(), albumId);
  return { success: true };
}

export function addPhotoToAlbum(albumId: string, photoId: string, user: CurrentUser) {
  const sqlite = getSqlite();
  const row = sqlite.prepare(`SELECT * FROM albums WHERE id = ?`).get(albumId) as any;
  if (!row) return { error: 'Album not found', status: 404 };
  if (!canEditAlbum(row, user)) return { error: 'Forbidden', status: 403 };

  const photo = sqlite.prepare(`SELECT id FROM photos WHERE id = ?`).get(photoId);
  if (!photo) return { error: 'Photo not found', status: 404 };

  const now = new Date().toISOString();
  sqlite.prepare(`
    INSERT OR IGNORE INTO album_photos (album_id, photo_id, added_by_user_id, added_at)
    VALUES (?, ?, ?, ?)
  `).run(albumId, photoId, user.id, now);
  sqlite.prepare(`UPDATE albums SET updated_at = ? WHERE id = ?`).run(now, albumId);
  return { success: true };
}

export function removePhotoFromAlbum(albumId: string, photoId: string, user: CurrentUser) {
  const sqlite = getSqlite();
  const row = sqlite.prepare(`SELECT * FROM albums WHERE id = ?`).get(albumId) as any;
  if (!row) return { error: 'Album not found', status: 404 };
  if (!canEditAlbum(row, user)) return { error: 'Forbidden', status: 403 };

  sqlite.prepare(`DELETE FROM album_photos WHERE album_id = ? AND photo_id = ?`).run(albumId, photoId);
  sqlite.prepare(`UPDATE albums SET updated_at = ? WHERE id = ?`).run(new Date().toISOString(), albumId);
  return { success: true };
}
