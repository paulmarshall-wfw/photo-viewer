import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import type { Comment } from '@photo-viewer/shared';
import { getSqlite } from '../db/connection.js';
import { ensureFollowing } from '../follows/service.js';
import { createNotifications } from '../notifications/service.js';
import { logActivity } from '../activity/service.js';

const MAX_BODY = 500;

export async function commentsRoutes(app: FastifyInstance) {
  // List threaded comments
  app.get<{ Params: { id: string } }>('/api/photos/:id/comments', async (request, reply) => {
    const sqlite = getSqlite();
    const photo = sqlite.prepare(`SELECT id FROM photos WHERE id = ?`).get(request.params.id);
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const rows = sqlite.prepare(`
      SELECT c.id, c.photo_id, c.user_id, c.parent_comment_id, c.body, c.created_at,
             COALESCE(u.display_name, u.email) AS user_display_name
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.photo_id = ?
      ORDER BY c.created_at ASC
    `).all(request.params.id) as any[];

    const map = new Map<string, Comment>();
    const topLevel: Comment[] = [];

    for (const r of rows) {
      const c: Comment = {
        id: r.id,
        photoId: r.photo_id,
        userId: r.user_id,
        userDisplayName: r.user_display_name || 'Unknown',
        parentCommentId: r.parent_comment_id,
        body: r.body,
        createdAt: r.created_at,
        replies: [],
      };
      map.set(c.id, c);
      if (!c.parentCommentId) topLevel.push(c);
    }

    for (const r of rows) {
      if (r.parent_comment_id) {
        const parent = map.get(r.parent_comment_id);
        const child = map.get(r.id);
        if (parent && child) parent.replies.push(child);
      }
    }

    return { comments: topLevel };
  });

  // Add comment or reply
  app.post<{ Params: { id: string }; Body: { body: string; parentCommentId?: string } }>(
    '/api/photos/:id/comments',
    async (request, reply) => {
      const sqlite = getSqlite();
      const photoId = request.params.id;
      const photo = sqlite.prepare(`SELECT id FROM photos WHERE id = ?`).get(photoId);
      if (!photo) return reply.code(404).send({ error: 'Photo not found' });

      const body = (request.body.body || '').trim();
      if (!body) return reply.code(400).send({ error: 'Comment body required' });
      if (body.length > MAX_BODY) return reply.code(400).send({ error: `Max ${MAX_BODY} chars` });

      let parentCommentId: string | null = request.body.parentCommentId || null;
      if (parentCommentId) {
        const parent = sqlite.prepare(
          `SELECT parent_comment_id FROM comments WHERE id = ? AND photo_id = ?`
        ).get(parentCommentId, photoId) as any;
        if (!parent) return reply.code(404).send({ error: 'Parent comment not found' });
        // Enforce one level of threading: replies cannot have replies
        if (parent.parent_comment_id) {
          return reply.code(400).send({ error: 'Cannot reply to a reply' });
        }
      }

      const id = nanoid();
      const userId = request.user!.id;
      const createdAt = new Date().toISOString();

      sqlite.prepare(
        `INSERT INTO comments (id, photo_id, user_id, parent_comment_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, photoId, userId, parentCommentId, body, createdAt);

      ensureFollowing(userId, photoId);
      createNotifications(photoId, userId, parentCommentId ? 'reply' : 'comment');
      logActivity(userId, photoId, 'add_comment');

      return {
        comment: {
          id,
          photoId,
          userId,
          userDisplayName: request.user?.displayName || request.user?.email || 'Unknown',
          parentCommentId,
          body,
          createdAt,
          replies: [],
        },
      };
    }
  );

  // Delete comment (own, or admin)
  app.delete<{ Params: { id: string } }>('/api/comments/:id', async (request, reply) => {
    const sqlite = getSqlite();
    const row = sqlite.prepare(`SELECT user_id, photo_id FROM comments WHERE id = ?`).get(request.params.id) as any;
    if (!row) return reply.code(404).send({ error: 'Comment not found' });

    const isOwn = row.user_id === request.user!.id;
    const isAdmin = request.user?.role === 'admin';
    if (!isOwn && !isAdmin) return reply.code(403).send({ error: 'Forbidden' });

    // Delete replies too
    sqlite.prepare(`DELETE FROM comments WHERE id = ? OR parent_comment_id = ?`).run(request.params.id, request.params.id);
    logActivity(request.user!.id, row.photo_id, 'delete_comment');
    return { success: true };
  });
}
