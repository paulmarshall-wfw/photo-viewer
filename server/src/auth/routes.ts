import type { FastifyInstance } from 'fastify';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS } from '@photo-viewer/shared';
import { acceptInvite, loginByEmail, logoutUser } from './service.js';

const COOKIE_MAX_AGE = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;

export async function authRoutes(app: FastifyInstance) {
  app.get('/api/auth/me', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    return {
      user: {
        id: request.user.id,
        email: request.user.email,
        displayName: request.user.displayName,
        role: request.user.role,
        inviteAcceptedAt: request.user.inviteAcceptedAt,
        revokedAt: request.user.revokedAt,
        createdAt: request.user.createdAt,
      },
    };
  });

  app.post<{ Body: { token: string; displayName: string } }>('/api/auth/accept-invite', async (request, reply) => {
    const { token, displayName } = request.body;
    if (!token || !displayName) {
      return reply.code(400).send({ error: 'Token and display name are required' });
    }

    const result = acceptInvite(token, displayName);
    if (!result) {
      return reply.code(400).send({ error: 'Invalid or expired invite token' });
    }

    reply.setCookie(SESSION_COOKIE_NAME, result.sessionToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        role: result.user.role,
        inviteAcceptedAt: result.user.inviteAcceptedAt,
        revokedAt: result.user.revokedAt,
        createdAt: result.user.createdAt,
      },
    };
  });

  app.post<{ Body: { email: string } }>('/api/auth/login', async (request, reply) => {
    const { email } = request.body;
    if (!email) {
      return reply.code(400).send({ error: 'Email is required' });
    }

    const result = loginByEmail(email);
    if (!result) {
      return reply.code(401).send({ error: 'No account found for this email' });
    }

    reply.setCookie(SESSION_COOKIE_NAME, result.sessionToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        role: result.user.role,
        inviteAcceptedAt: result.user.inviteAcceptedAt,
        revokedAt: result.user.revokedAt,
        createdAt: result.user.createdAt,
      },
    };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    // Use the session token from the authenticated user
    if (request.user?.sessionToken) {
      logoutUser(request.user.sessionToken);
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return { success: true };
  });
}
