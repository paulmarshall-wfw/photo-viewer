import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SESSION_COOKIE_NAME } from '@photo-viewer/shared';
import { validateSession } from './service.js';
import type { users } from '../db/schema.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: typeof users.$inferSelect;
  }
}

export const authPlugin = fp(async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('user', undefined);

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Public routes: don't require auth, but still try to attach user if cookie present
    const publicPaths = ['/api/health', '/api/setup/status', '/api/setup', '/api/auth/accept-invite', '/api/auth/login', '/api/browse-directories'];
    const isPublic = publicPaths.some(p => request.url.startsWith(p));
    if (isPublic) {
      // Try to attach user from cookie even on public routes (for optional auth)
      const cookieHeader = request.headers.cookie || '';
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => c.trim().split('=')).filter(p => p.length === 2).map(([k, v]) => [k, v])
      );
      const token = cookies[SESSION_COOKIE_NAME];
      if (token) {
        const user = validateSession(token);
        if (user) request.user = user;
      }
      return;
    }

    // Skip auth for non-API routes (client assets)
    if (!request.url.startsWith('/api/')) return;

    const cookieHeader = request.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => c.trim().split('=')).filter(p => p.length === 2).map(([k, v]) => [k, v])
    );
    const token = cookies[SESSION_COOKIE_NAME];
    if (!token) {
      reply.code(401).send({ error: 'Not authenticated' });
      return;
    }

    const user = validateSession(token);
    if (!user) {
      reply.code(401).send({ error: 'Session expired or revoked' });
      return;
    }

    request.user = user;
  });
});
