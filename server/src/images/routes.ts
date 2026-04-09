import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { photos } from '../db/schema.js';
import { getPhotosPath } from '../admin/service.js';
import { hasCachedThumbnail, hasCachedPreview, getThumbnailPath, getPreviewPath } from './cache.js';
import { generateThumbnail, generatePreview, generateThumbnailFromBuffer, generatePreviewFromBuffer, generateThumbnailFromPsd, generatePreviewFromPsd } from './preview-generator.js';
import { extractEmbeddedPreview } from './raw-processor.js';

// Simple concurrency limiter
let activeJobs = 0;
const MAX_CONCURRENT = 4;
const queue: (() => void)[] = [];

async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  while (activeJobs >= MAX_CONCURRENT) {
    await new Promise<void>(resolve => queue.push(resolve));
  }
  activeJobs++;
  try {
    return await fn();
  } finally {
    activeJobs--;
    const next = queue.shift();
    if (next) next();
  }
}

export async function imageRoutes(app: FastifyInstance) {
  // Serve thumbnail
  app.get<{ Params: { id: string } }>('/api/photos/:id/thumbnail', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const photosPath = getPhotosPath();
    if (!photosPath) return reply.code(500).send({ error: 'Photos path not configured' });

    // Check cache
    if (hasCachedThumbnail(photo.id)) {
      reply.header('Cache-Control', 'public, max-age=86400');
      return reply.type('image/jpeg').send(fs.createReadStream(getThumbnailPath(photo.id)));
    }

    // Generate
    try {
      await withConcurrencyLimit(async () => {
        const absolutePath = path.join(photosPath, photo.filePath);

        if (photo.format === 'psd') {
          await generateThumbnailFromPsd(absolutePath, photo.id);
        } else if (photo.format === 'raw') {
          // Try embedded preview first
          const embedded = await extractEmbeddedPreview(absolutePath);
          if (embedded) {
            await generateThumbnailFromBuffer(embedded, photo.id);
          } else {
            // Fallback: try sharp directly (works for some DNG files)
            await generateThumbnail(absolutePath, photo.id);
          }
        } else {
          await generateThumbnail(absolutePath, photo.id);
        }

        // Update DB cache status
        db.update(photos)
          .set({ hasThumbnail: true, thumbnailPath: getThumbnailPath(photo.id) })
          .where(eq(photos.id, photo.id))
          .run();
      });

      reply.header('Cache-Control', 'public, max-age=86400');
      return reply.type('image/jpeg').send(fs.createReadStream(getThumbnailPath(photo.id)));
    } catch (err) {
      request.log.error(err, 'Failed to generate thumbnail');
      return reply.code(500).send({ error: 'Failed to generate thumbnail' });
    }
  });

  // Serve preview
  app.get<{ Params: { id: string } }>('/api/photos/:id/preview', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const photosPath = getPhotosPath();
    if (!photosPath) return reply.code(500).send({ error: 'Photos path not configured' });

    // Check cache
    if (hasCachedPreview(photo.id)) {
      reply.header('Cache-Control', 'public, max-age=86400');
      return reply.type('image/jpeg').send(fs.createReadStream(getPreviewPath(photo.id)));
    }

    // Generate
    try {
      await withConcurrencyLimit(async () => {
        const absolutePath = path.join(photosPath, photo.filePath);

        if (photo.format === 'psd') {
          await generatePreviewFromPsd(absolutePath, photo.id);
        } else if (photo.format === 'raw') {
          const embedded = await extractEmbeddedPreview(absolutePath);
          if (embedded) {
            await generatePreviewFromBuffer(embedded, photo.id);
          } else {
            await generatePreview(absolutePath, photo.id);
          }
        } else {
          await generatePreview(absolutePath, photo.id);
        }

        db.update(photos)
          .set({ hasPreview: true, previewPath: getPreviewPath(photo.id) })
          .where(eq(photos.id, photo.id))
          .run();
      });

      reply.header('Cache-Control', 'public, max-age=86400');
      return reply.type('image/jpeg').send(fs.createReadStream(getPreviewPath(photo.id)));
    } catch (err) {
      request.log.error(err, 'Failed to generate preview');
      return reply.code(500).send({ error: 'Failed to generate preview' });
    }
  });

  // Download original
  app.get<{ Params: { id: string } }>('/api/photos/:id/original', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const photosPath = getPhotosPath();
    if (!photosPath) return reply.code(500).send({ error: 'Photos path not configured' });

    const absolutePath = path.join(photosPath, photo.filePath);
    if (!fs.existsSync(absolutePath)) {
      return reply.code(404).send({ error: 'File not found on disk' });
    }

    reply.header('Content-Disposition', `attachment; filename="${photo.filename}"`);
    reply.header('Content-Type', 'application/octet-stream');
    return reply.send(fs.createReadStream(absolutePath));
  });
}
