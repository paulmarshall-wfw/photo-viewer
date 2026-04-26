import { eq, sql } from 'drizzle-orm';
import type { SortField, SortOrder } from '@photo-viewer/shared';
import { getDb, getSqlite } from '../db/connection.js';
import { folders, photos } from '../db/schema.js';

export function getFolderByPath(folderPath: string) {
  const db = getDb();
  return db.select().from(folders).where(eq(folders.path, folderPath)).get() ?? null;
}

export function getSubfolders(parentPath: string | null) {
  const db = getDb();
  if (parentPath === null || parentPath === '') {
    return db.select().from(folders)
      .where(sql`${folders.parentPath} IS NULL OR ${folders.parentPath} = ''`)
      .all()
      .filter(f => f.path !== '');
  }
  return db.select().from(folders).where(eq(folders.parentPath, parentPath)).all();
}

function rowToPhoto(r: any) {
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
    thumbnailPath: r.thumbnail_path,
    previewPath: r.preview_path,
    location: r.location,
    indexedAt: r.indexed_at,
    reactionCount: r.reaction_count ?? 0,
    commentCount: r.comment_count ?? 0,
  };
}

export function getPhotosInFolder(
  folderPath: string,
  sort: SortField = 'filename',
  order: SortOrder = 'asc',
  page: number = 1,
  limit: number = 100,
  personTag?: string,
) {
  const sqlite = getSqlite();
  const offset = (page - 1) * limit;
  const dir = order === 'desc' ? 'DESC' : 'ASC';

  let orderClause: string;
  switch (sort) {
    case 'date':
      orderClause = `p.date_taken ${dir}`;
      break;
    case 'timeline':
      // SQLite NULLS LAST workaround
      orderClause = `CASE WHEN p.date_taken IS NULL THEN 1 ELSE 0 END, p.date_taken ASC, p.filename ASC`;
      break;
    case 'annotation':
      orderClause = `p.title ASC`;
      break;
    default:
      orderClause = `p.filename ${dir}`;
  }

  const params: any[] = [folderPath];
  let whereClause = `p.folder_path = ?`;
  let joinTag = '';

  if (personTag) {
    joinTag = `
      INNER JOIN photo_people_tags ppt ON ppt.photo_id = p.id
      INNER JOIN people_tags pt ON pt.id = ppt.tag_id
    `;
    whereClause += ` AND LOWER(pt.name) = LOWER(?)`;
    params.push(personTag);
  }

  const query = `
    SELECT p.*,
      (SELECT COUNT(*) FROM reactions r WHERE r.photo_id = p.id) AS reaction_count,
      (SELECT COUNT(*) FROM comments c WHERE c.photo_id = p.id) AS comment_count
    FROM photos p
    ${joinTag}
    WHERE ${whereClause}
    ORDER BY ${orderClause}
    LIMIT ? OFFSET ?
  `;

  const rows = sqlite.prepare(query).all(...params, limit, offset) as any[];

  const countQuery = `
    SELECT COUNT(*) as count
    FROM photos p
    ${joinTag}
    WHERE ${whereClause}
  `;
  const countRow = sqlite.prepare(countQuery).get(...params) as any;

  return {
    items: rows.map(rowToPhoto),
    total: countRow?.count ?? 0,
  };
}

export function getPhotoById(id: string) {
  const db = getDb();
  return db.select().from(photos).where(eq(photos.id, id)).get() ?? null;
}

export function getBreadcrumbs(folderPath: string): { name: string; path: string }[] {
  if (!folderPath) return [];

  const parts = folderPath.split('/');
  const crumbs: { name: string; path: string }[] = [];
  let currentPath = '';

  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    crumbs.push({ name: part, path: currentPath });
  }

  return crumbs;
}
