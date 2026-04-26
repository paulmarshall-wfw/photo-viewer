import type { FastifyInstance } from 'fastify';
import { getSqlite } from '../db/connection.js';
import { ensureFollowing, isFollowing, unfollow } from './service.js';

export async function followsRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/api/photos/:id/follow', async (request, reply) => {
    const sqlite = getSqlite();
    const photo = sqlite.prepare(`SELECT id FROM photos WHERE id = ?`).get(request.params.id);
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });
    return { following: isFollowing(request.user!.id, request.params.id) };
  });

  app.post<{ Params: { id: string } }>('/api/photos/:id/follow', async (request, reply) => {
    const sqlite = getSqlite();
    const photo = sqlite.prepare(`SELECT id FROM photos WHERE id = ?`).get(request.params.id);
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });
    ensureFollowing(request.user!.id, request.params.id);
    return { following: true };
  });

  app.delete<{ Params: { id: string } }>('/api/photos/:id/follow', async (request, reply) => {
    const sqlite = getSqlite();
    const photo = sqlite.prepare(`SELECT id FROM photos WHERE id = ?`).get(request.params.id);
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });
    unfollow(request.user!.id, request.params.id);
    return { following: false };
  });
}
