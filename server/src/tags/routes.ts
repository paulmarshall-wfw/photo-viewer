import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { getSqlite } from '../db/connection.js';
import { ensureFollowing } from '../follows/service.js';
import { createNotifications } from '../notifications/service.js';
import { logActivity } from '../activity/service.js';

export async function tagsRoutes(app: FastifyInstance) {
  // All people tags in system
  app.get('/api/people-tags', async () => {
    const sqlite = getSqlite();
    const rows = sqlite.prepare(`SELECT id, name FROM people_tags ORDER BY name ASC`).all() as any[];
    return { tags: rows.map(r => ({ id: r.id, name: r.name })) };
  });

  // People tags on a photo
  app.get<{ Params: { id: string } }>('/api/photos/:id/people-tags', async (request, reply) => {
    const sqlite = getSqlite();
    const photo = sqlite.prepare(`SELECT id FROM photos WHERE id = ?`).get(request.params.id);
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const rows = sqlite.prepare(`
      SELECT pt.id, pt.name
      FROM photo_people_tags ppt
      INNER JOIN people_tags pt ON pt.id = ppt.tag_id
      WHERE ppt.photo_id = ?
      ORDER BY pt.name ASC
    `).all(request.params.id) as any[];

    return { tags: rows.map(r => ({ id: r.id, name: r.name })) };
  });

  // Add tag (creates tag if missing)
  app.post<{ Params: { id: string }; Body: { name: string } }>('/api/photos/:id/people-tags', async (request, reply) => {
    const sqlite = getSqlite();
    const photoId = request.params.id;
    const photo = sqlite.prepare(`SELECT id FROM photos WHERE id = ?`).get(photoId);
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const name = (request.body.name || '').trim();
    if (!name) return reply.code(400).send({ error: 'Tag name required' });

    const normalised = name.toLowerCase();
    let tagRow = sqlite.prepare(`SELECT id, name FROM people_tags WHERE LOWER(name) = ?`).get(normalised) as any;
    if (!tagRow) {
      const id = nanoid();
      sqlite.prepare(`INSERT INTO people_tags (id, name) VALUES (?, ?)`).run(id, name);
      tagRow = { id, name };
    }

    const existing = sqlite.prepare(
      `SELECT 1 FROM photo_people_tags WHERE photo_id = ? AND tag_id = ?`
    ).get(photoId, tagRow.id);

    const userId = request.user!.id;
    if (!existing) {
      sqlite.prepare(
        `INSERT INTO photo_people_tags (photo_id, tag_id, created_at) VALUES (?, ?, ?)`
      ).run(photoId, tagRow.id, new Date().toISOString());
      ensureFollowing(userId, photoId);
      createNotifications(photoId, userId, 'people_tag', tagRow.name);
      logActivity(userId, photoId, 'add_people_tag', JSON.stringify({ name: tagRow.name }));
    }

    return { tag: { id: tagRow.id, name: tagRow.name } };
  });

  // Remove tag from photo
  app.delete<{ Params: { id: string; tagId: string } }>('/api/photos/:id/people-tags/:tagId', async (request, reply) => {
    const sqlite = getSqlite();
    const { id: photoId, tagId } = request.params;
    sqlite.prepare(`DELETE FROM photo_people_tags WHERE photo_id = ? AND tag_id = ?`).run(photoId, tagId);
    logActivity(request.user!.id, photoId, 'remove_people_tag');
    return { success: true };
  });
}
