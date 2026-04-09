import type { FastifyInstance } from 'fastify';
import { getActivityEntries } from './service.js';

export async function activityRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { page?: string; limit?: string; userId?: string };
  }>('/api/activity', async (request) => {
    const page = parseInt(request.query.page || '1', 10);
    const limit = Math.min(parseInt(request.query.limit || '50', 10), 200);
    const { entries, total } = getActivityEntries(page, limit, request.query.userId);

    return { entries, total, page, limit };
  });
}
