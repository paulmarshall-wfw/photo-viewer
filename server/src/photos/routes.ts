import type { FastifyInstance } from 'fastify';
import type { SortField, SortOrder } from '@photo-viewer/shared';
import { DEFAULT_PAGE_SIZE } from '@photo-viewer/shared';
import path from 'node:path';
import { getFolderByPath, getSubfolders, getPhotosInFolder, getPhotoById, getBreadcrumbs } from './service.js';
import { runIndex, getIndexProgress, isIndexing, validateIndexTarget } from './indexer.js';
import { readStory } from '../metadata/story.js';
import { getPhotosPath } from '../admin/service.js';
import { getGlobalStats, getFolderStats } from './stats.js';

export async function photoRoutes(app: FastifyInstance) {
  // Trigger indexing
  app.post<{ Body: { folderPath?: string; includeSubfolders?: boolean } }>('/api/index', async (request, reply) => {
    if (isIndexing()) {
      return { status: 'already_running', progress: getIndexProgress() };
    }

    const folderPath = request.body?.folderPath;
    const includeSubfolders = request.body?.includeSubfolders === true;

    try {
      validateIndexTarget(folderPath || undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid index target';
      return reply.code(400).send({ error: message });
    }

    // Run in background
    runIndex(folderPath || undefined, { includeSubfolders }).catch(err => {
      request.log.error(err, 'Indexing failed');
    });

    return { status: 'started', progress: getIndexProgress() };
  });

  // Index progress
  app.get('/api/index/progress', async () => {
    return getIndexProgress();
  });

  // Browse folder contents
  app.get<{
    Params: { '*': string };
    Querystring: { sort?: SortField; order?: SortOrder; page?: string; limit?: string; personTag?: string };
  }>('/api/folders/*', async (request) => {
    const folderPath = (request.params as any)['*'] || '';
    const { sort, order, page: pageStr, limit: limitStr, personTag } = request.query;
    const page = parseInt(pageStr || '1', 10);
    const limit = Math.min(parseInt(limitStr || String(DEFAULT_PAGE_SIZE), 10), 500);

    const folder = getFolderByPath(folderPath);
    const subfolders = getSubfolders(folderPath);
    const { items: photoList, total } = getPhotosInFolder(folderPath, sort, order, page, limit, personTag);
    const breadcrumbs = getBreadcrumbs(folderPath);

    return {
      folder,
      subfolders,
      photos: photoList,
      totalPhotos: total,
      page,
      limit,
      breadcrumbs,
    };
  });

  // Single photo detail
  app.get<{ Params: { id: string } }>('/api/photos/:id', async (request, reply) => {
    const photo = getPhotoById(request.params.id);
    if (!photo) {
      return reply.code(404).send({ error: 'Photo not found' });
    }
    const photosPath = getPhotosPath();
    const story = photosPath ? readStory(path.join(photosPath, photo.filePath)) : [];
    return { photo, story };
  });

  // Global stats
  app.get('/api/stats', async () => {
    return { global: getGlobalStats() };
  });

  // Folder stats
  app.get<{ Params: { '*': string } }>('/api/stats/folder/*', async (request) => {
    const folderPath = (request.params as any)['*'] || '';
    return { folder: getFolderStats(folderPath), global: getGlobalStats() };
  });
}
