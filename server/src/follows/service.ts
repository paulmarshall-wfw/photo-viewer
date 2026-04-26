import { getSqlite } from '../db/connection.js';

export function ensureFollowing(userId: string, photoId: string): void {
  const sqlite = getSqlite();
  sqlite.prepare(
    `INSERT OR IGNORE INTO photo_follows (photo_id, user_id, created_at) VALUES (?, ?, ?)`
  ).run(photoId, userId, new Date().toISOString());
}

export function isFollowing(userId: string, photoId: string): boolean {
  const sqlite = getSqlite();
  const row = sqlite.prepare(
    `SELECT 1 FROM photo_follows WHERE photo_id = ? AND user_id = ? LIMIT 1`
  ).get(photoId, userId);
  return !!row;
}

export function unfollow(userId: string, photoId: string): void {
  const sqlite = getSqlite();
  sqlite.prepare(
    `DELETE FROM photo_follows WHERE photo_id = ? AND user_id = ?`
  ).run(photoId, userId);
}

export function getFollowers(photoId: string): string[] {
  const sqlite = getSqlite();
  const rows = sqlite.prepare(
    `SELECT user_id FROM photo_follows WHERE photo_id = ?`
  ).all(photoId) as Array<{ user_id: string }>;
  return rows.map(r => r.user_id);
}
