import type { FastifyInstance } from 'fastify';
import { getSqlite } from '../db/connection.js';

export async function notificationsRoutes(app: FastifyInstance) {
  app.get('/api/notifications', async (request) => {
    const sqlite = getSqlite();
    const userId = request.user!.id;

    const rows = sqlite.prepare(`
      SELECT n.id, n.user_id, n.photo_id, n.actor_id, n.action_type, n.detail, n.read, n.created_at,
             p.filename AS photo_filename, p.folder_path AS photo_folder_path,
             COALESCE(u.display_name, u.email) AS actor_display_name
      FROM notifications n
      LEFT JOIN photos p ON p.id = n.photo_id
      LEFT JOIN users u ON u.id = n.actor_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 100
    `).all(userId) as any[];

    const unreadRow = sqlite.prepare(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0`
    ).get(userId) as any;

    const totalRow = sqlite.prepare(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ?`
    ).get(userId) as any;

    return {
      notifications: rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        photoId: r.photo_id,
        photoFilename: r.photo_filename || 'Unknown',
        photoFolderPath: r.photo_folder_path || '',
        actorId: r.actor_id,
        actorDisplayName: r.actor_display_name || 'Unknown',
        actionType: r.action_type,
        detail: r.detail,
        read: !!r.read,
        createdAt: r.created_at,
      })),
      unreadCount: unreadRow?.count ?? 0,
      total: totalRow?.count ?? 0,
    };
  });

  app.patch<{ Params: { id: string } }>('/api/notifications/:id/read', async (request, reply) => {
    const sqlite = getSqlite();
    const result = sqlite.prepare(
      `UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`
    ).run(request.params.id, request.user!.id);
    if (result.changes === 0) return reply.code(404).send({ error: 'Not found' });
    return { success: true };
  });

  app.post('/api/notifications/read-all', async (request) => {
    const sqlite = getSqlite();
    sqlite.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ?`).run(request.user!.id);
    return { success: true };
  });
}
