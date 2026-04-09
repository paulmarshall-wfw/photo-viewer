import { eq, sql, asc, desc } from 'drizzle-orm';
import type { SortField, SortOrder } from '@photo-viewer/shared';
import { getDb } from '../db/connection.js';
import { folders, photos } from '../db/schema.js';

export function getFolderByPath(folderPath: string) {
  const db = getDb();
  return db.select().from(folders).where(eq(folders.path, folderPath)).get() ?? null;
}

export function getSubfolders(parentPath: string | null) {
  const db = getDb();
  if (parentPath === null || parentPath === '') {
    // Root level: get folders with no parent OR parent = ''
    return db.select().from(folders)
      .where(sql`${folders.parentPath} IS NULL OR ${folders.parentPath} = ''`)
      .all()
      .filter(f => f.path !== ''); // Exclude root itself
  }
  return db.select().from(folders).where(eq(folders.parentPath, parentPath)).all();
}

export function getPhotosInFolder(
  folderPath: string,
  sort: SortField = 'filename',
  order: SortOrder = 'asc',
  page: number = 1,
  limit: number = 100,
) {
  const db = getDb();
  const offset = (page - 1) * limit;

  let orderBy;
  switch (sort) {
    case 'date':
      orderBy = order === 'asc' ? asc(photos.dateTaken) : desc(photos.dateTaken);
      break;
    case 'annotation':
      orderBy = asc(photos.title); // NULLs first = needs annotation first
      break;
    default:
      orderBy = order === 'asc' ? asc(photos.filename) : desc(photos.filename);
  }

  const items = db.select().from(photos)
    .where(eq(photos.folderPath, folderPath))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = db.select({ count: sql<number>`count(*)` })
    .from(photos)
    .where(eq(photos.folderPath, folderPath))
    .get();

  return {
    items,
    total: countResult?.count ?? 0,
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
