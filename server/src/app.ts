import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { authPlugin } from './auth/plugin.js';
import { authRoutes } from './auth/routes.js';
import { adminRoutes } from './admin/routes.js';
import { photoRoutes } from './photos/routes.js';
import { imageRoutes } from './images/routes.js';
import { metadataRoutes } from './metadata/routes.js';
import { activityRoutes } from './activity/routes.js';
import { searchRoutes } from './search/routes.js';
import { reactionsRoutes } from './reactions/routes.js';
import { commentsRoutes } from './comments/routes.js';
import { tagsRoutes } from './tags/routes.js';
import { followsRoutes } from './follows/routes.js';
import { notificationsRoutes } from './notifications/routes.js';
import { onThisDayRoutes } from './on-this-day/routes.js';
import { albumRoutes } from './albums/routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(cookie);

  // Auth middleware
  await app.register(authPlugin);

  // API routes
  await app.register(authRoutes);
  await app.register(adminRoutes);
  await app.register(photoRoutes);
  await app.register(imageRoutes);
  await app.register(metadataRoutes);
  await app.register(activityRoutes);
  await app.register(searchRoutes);
  await app.register(reactionsRoutes);
  await app.register(commentsRoutes);
  await app.register(tagsRoutes);
  await app.register(followsRoutes);
  await app.register(notificationsRoutes);
  await app.register(onThisDayRoutes);
  await app.register(albumRoutes);

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Serve client in production
  const clientDist = path.resolve(config.dataDir, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    await app.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
    });

    // SPA fallback — serve index.html for all non-API routes
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.code(404).send({ error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  } else {
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.code(404).send({ error: 'Not found' });
      }
      return reply.code(200).send('Client not built. Run: npm run build --workspace=client');
    });
  }

  return app;
}
