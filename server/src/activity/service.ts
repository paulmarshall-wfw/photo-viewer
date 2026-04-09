import { nanoid } from 'nanoid';
import { sql, desc, eq } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { activity, users, photos } from '../db/schema.js';

export function logActivity(
  userId: string,
  photoId: string,
  action: string,
  detail?: string,
): void {
  const db = getDb();
  db.insert(activity).values({
    id: nanoid(),
    userId,
    photoId,
    action,
    detail: detail ?? null,
    createdAt: new Date().toISOString(),
  }).run();
}

export function getActivityEntries(
  page: number = 1,
  limit: number = 50,
  userId?: string,
) {
  const db = getDb();
  const offset = (page - 1) * limit;

  // Build raw SQL for the join
  const sqlite = db.$client as any;

  let query = `
    SELECT
      a.id, a.action, a.detail, a.created_at,
      a.user_id, u.display_name as user_display_name,
      a.photo_id, p.filename as photo_filename, p.folder_path as photo_folder_path
    FROM activity a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN photos p ON a.photo_id = p.id
  `;
  const params: any[] = [];

  if (userId) {
    query += ` WHERE a.user_id = ?`;
    params.push(userId);
  }

  query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const rows = sqlite.prepare(query).all(...params);

  // Count total
  let countQuery = `SELECT count(*) as count FROM activity`;
  const countParams: any[] = [];
  if (userId) {
    countQuery += ` WHERE user_id = ?`;
    countParams.push(userId);
  }
  const total = sqlite.prepare(countQuery).get(...countParams)?.count ?? 0;

  return {
    entries: rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      userDisplayName: r.user_display_name || 'Unknown',
      photoId: r.photo_id,
      photoFilename: r.photo_filename || 'Unknown',
      photoFolderPath: r.photo_folder_path || '',
      action: r.action,
      detail: r.detail,
      createdAt: r.created_at,
    })),
    total,
  };
}
