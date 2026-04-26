import { nanoid } from 'nanoid';
import type { NotificationActionType } from '@photo-viewer/shared';
import { getSqlite } from '../db/connection.js';
import { getFollowers } from '../follows/service.js';

export function createNotifications(
  photoId: string,
  actorId: string,
  actionType: NotificationActionType,
  detail?: string | null,
): void {
  const followers = getFollowers(photoId).filter(uid => uid !== actorId);
  if (followers.length === 0) return;

  const sqlite = getSqlite();
  const stmt = sqlite.prepare(
    `INSERT INTO notifications (id, user_id, photo_id, actor_id, action_type, detail, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  );
  const now = new Date().toISOString();
  const insertMany = sqlite.transaction((userIds: string[]) => {
    for (const userId of userIds) {
      stmt.run(nanoid(), userId, photoId, actorId, actionType, detail ?? null, now);
    }
  });
  insertMany(followers);
}
