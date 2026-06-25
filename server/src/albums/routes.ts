import type { FastifyInstance } from 'fastify';
import {
  addFolderToAlbum,
  addPhotoToAlbum,
  createAlbum,
  deleteAlbum,
  getAlbumDetail,
  listAlbums,
  listEditableAlbumMembership,
  removeFolderFromAlbum,
  removePhotoFromAlbum,
  updateAlbum,
} from './service.js';

function sendServiceResult(reply: any, result: any) {
  if (result?.error) {
    return reply.code(result.status ?? 400).send({ error: result.error });
  }
  return result;
}

export async function albumRoutes(app: FastifyInstance) {
  app.get('/api/albums', async (request) => {
    return { albums: listAlbums(request.user!) };
  });

  app.post<{ Body: { name: string; visibility?: 'private' | 'shared' } }>('/api/albums', async (request, reply) => {
    const result = createAlbum(request.user!, request.body);
    return sendServiceResult(reply, result);
  });

  app.get<{ Querystring: { photoId?: string; folderPath?: string } }>('/api/albums/membership', async (request, reply) => {
    const { photoId, folderPath } = request.query;
    if ((!photoId && !folderPath) || (photoId && folderPath)) {
      return reply.code(400).send({ error: 'Provide photoId or folderPath' });
    }
    return {
      albums: listEditableAlbumMembership(request.user!, { photoId, folderPath }),
    };
  });

  app.get<{ Params: { id: string } }>('/api/albums/:id', async (request, reply) => {
    const album = getAlbumDetail(request.params.id, request.user!);
    if (!album) return reply.code(404).send({ error: 'Album not found' });
    return { album };
  });

  app.patch<{ Params: { id: string }; Body: { name?: string; visibility?: 'private' | 'shared' } }>('/api/albums/:id', async (request, reply) => {
    const result = updateAlbum(request.params.id, request.user!, request.body);
    return sendServiceResult(reply, result);
  });

  app.delete<{ Params: { id: string } }>('/api/albums/:id', async (request, reply) => {
    const result = deleteAlbum(request.params.id, request.user!);
    return sendServiceResult(reply, result);
  });

  app.post<{ Params: { id: string }; Body: { folderPath: string } }>('/api/albums/:id/folders', async (request, reply) => {
    if (!request.body?.folderPath) return reply.code(400).send({ error: 'folderPath required' });
    const result = addFolderToAlbum(request.params.id, request.body.folderPath, request.user!);
    return sendServiceResult(reply, result);
  });

  app.delete<{ Params: { id: string }; Body: { folderPath: string } }>('/api/albums/:id/folders', async (request, reply) => {
    if (!request.body?.folderPath) return reply.code(400).send({ error: 'folderPath required' });
    const result = removeFolderFromAlbum(request.params.id, request.body.folderPath, request.user!);
    return sendServiceResult(reply, result);
  });

  app.post<{ Params: { id: string }; Body: { photoId: string } }>('/api/albums/:id/photos', async (request, reply) => {
    if (!request.body?.photoId) return reply.code(400).send({ error: 'photoId required' });
    const result = addPhotoToAlbum(request.params.id, request.body.photoId, request.user!);
    return sendServiceResult(reply, result);
  });

  app.delete<{ Params: { id: string; photoId: string } }>('/api/albums/:id/photos/:photoId', async (request, reply) => {
    const result = removePhotoFromAlbum(request.params.id, request.params.photoId, request.user!);
    return sendServiceResult(reply, result);
  });
}
