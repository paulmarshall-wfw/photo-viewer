import type { FastifyInstance } from 'fastify';
import { searchPhotos } from './service.js';

export async function searchRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: {
      q?: string;
      dateFrom?: string;
      dateTo?: string;
      hasTitle?: string;
      needsTitle?: string;
      hasCaption?: string;
      needsCaption?: string;
      hasStory?: string;
      needsStory?: string;
      page?: string;
      limit?: string;
    };
  }>('/api/search', async (request) => {
    const {
      q, dateFrom, dateTo,
      hasTitle, needsTitle, hasCaption, needsCaption, hasStory, needsStory,
      page: pageStr, limit: limitStr,
    } = request.query;

    const page = parseInt(pageStr || '1', 10);
    const limit = Math.min(parseInt(limitStr || '50', 10), 200);

    const { results, total } = searchPhotos({
      q: q || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      hasTitle: hasTitle === 'true',
      needsTitle: needsTitle === 'true',
      hasCaption: hasCaption === 'true',
      needsCaption: needsCaption === 'true',
      hasStory: hasStory === 'true',
      needsStory: needsStory === 'true',
      page,
      limit,
    });

    return { results, total, page, limit };
  });
}
