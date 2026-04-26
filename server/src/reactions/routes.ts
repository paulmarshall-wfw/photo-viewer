import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { getSqlite } from '../db/connection.js';
import { ensureFollowing } from '../follows/service.js';
import { createNotifications } from '../notifications/service.js';
import { logActivity } from '../activity/service.js';

const ALLOWED_EMOJI = ['❤️', '😂', '😢', '😮', '🙏', '👏'];

export async function reactionsRoutes(app: FastifyInstance) {
  // List reactions (attributed)
  app.get<{ Params: { id: string } }>('/api/photos/:id/reactions', async (request, reply) => {
    const sqlite = getSqlite();
    const photo = sqlite.prepare(`SELECT id FROM photos WHERE id = ?`).get(request.params.id);
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const rows = sqlite.prepare(`
      SELECT r.id, r.photo_id, r.user_id, r.emoji, r.created_at,
             COALESCE(u.display_name, u.email) AS user_display_name
      FROM reactions r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.photo_id = ?
      ORDER BY r.created_at ASC
    `).all(request.params.id) as any[];

    return {
      reactions: rows.map(r => ({
        id: r.id,
        photoId: r.photo_id,
        userId: r.user_id,
        userDisplayName: r.user_display_name || 'Unknown',
        emoji: r.emoji,
        createdAt: r.created_at,
      })),
    };
  });

  // Add reaction
  app.post<{ Params: { id: string }; Body: { emoji: string } }>('/api/photos/:id/reactions', async (request, reply) => {
    const sqlite = getSqlite();
    const photo = sqlite.prepare(`SELECT id FROM photos WHERE id = ?`).get(request.params.id);
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const { emoji } = request.body;
    if (!ALLOWED_EMOJI.includes(emoji)) {
      return reply.code(400).send({ error: 'Invalid emoji' });
    }

    const userId = request.user!.id;
    const photoId = request.params.id;

    const existing = sqlite.prepare(
      `SELECT id FROM reactions WHERE photo_id = ? AND user_id = ? AND emoji = ?`
    ).get(photoId, userId, emoji);

    if (existing) return { success: true };

    sqlite.prepare(
      `INSERT INTO reactions (id, photo_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(nanoid(), photoId, userId, emoji, new Date().toISOString());

    ensureFollowing(userId, photoId);
    createNotifications(photoId, userId, 'reaction', emoji);
    logActivity(userId, photoId, 'add_reaction', JSON.stringify({ emoji }));

    return { success: true };
  });

  // Remove own reaction
  app.delete<{ Params: { id: string; emoji: string } }>('/api/photos/:id/reactions/:emoji', async (request, reply) => {
    const sqlite = getSqlite();
    const userId = request.user!.id;
    const photoId = request.params.id;
    const emoji = decodeURIComponent(request.params.emoji);

    sqlite.prepare(
      `DELETE FROM reactions WHERE photo_id = ? AND user_id = ? AND emoji = ?`
    ).run(photoId, userId, emoji);

    logActivity(userId, photoId, 'remove_reaction', JSON.stringify({ emoji }));
    return { success: true };
  });
}
