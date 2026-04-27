import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { FastifyInstance } from 'fastify';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS } from '@photo-viewer/shared';
import { config } from '../config.js';
import { createAdminUser, createInvite, regenerateInvite, revokeUser, getAllUsers } from '../auth/service.js';
import { isSetupComplete, setConfig, getPhotosPath, setPhotosPath } from './service.js';

const COOKIE_MAX_AGE = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;

export async function adminRoutes(app: FastifyInstance) {
  // Setup status (public). Exposes setupLibraryPath when the server was
  // launched with SETUP_LIBRARY_PATH set so the client can hide the picker.
  app.get('/api/setup/status', async () => {
    return {
      needsSetup: !isSetupComplete(),
      setupLibraryPath: config.setupLibraryPath,
    };
  });

  // Initial setup (public, one-time).
  // photosPath is optional when SETUP_LIBRARY_PATH is set on the server.
  app.post<{ Body: { photosPath?: string; displayName: string; email: string } }>('/api/setup', async (request, reply) => {
    if (isSetupComplete()) {
      return reply.code(400).send({ error: 'Setup already completed' });
    }

    const { displayName, email } = request.body;
    const photosPath = request.body.photosPath || config.setupLibraryPath || '';

    if (!photosPath || !displayName || !email) {
      return reply.code(400).send({ error: 'All fields are required' });
    }

    // Validate photos path exists (inside the container if launcher-managed).
    if (!fs.existsSync(photosPath)) {
      return reply.code(400).send({ error: 'Photos path does not exist' });
    }

    // Create admin user
    const { user, sessionToken } = createAdminUser(email, displayName);

    // Store config
    setPhotosPath(photosPath);
    setConfig('setup_complete', 'true');

    reply.setCookie(SESSION_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        inviteAcceptedAt: user.inviteAcceptedAt,
        revokedAt: user.revokedAt,
        createdAt: user.createdAt,
      },
    };
  });

  // Admin: list users
  app.get('/api/admin/users', async (request, reply) => {
    if (request.user?.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }
    return { users: getAllUsers() };
  });

  // Admin: invite user
  app.post<{ Body: { email: string } }>('/api/admin/users/invite', async (request, reply) => {
    if (request.user?.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    const { email } = request.body;
    if (!email) {
      return reply.code(400).send({ error: 'Email is required' });
    }

    const { token } = createInvite(email);
    const baseUrl = `${request.protocol}://${request.hostname}`;
    const inviteUrl = `${baseUrl}/invite/${token}`;

    return { inviteUrl, token };
  });

  // Admin: revoke user
  app.delete<{ Params: { id: string } }>('/api/admin/users/:id', async (request, reply) => {
    if (request.user?.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    if (request.params.id === request.user.id) {
      return reply.code(400).send({ error: 'Cannot revoke your own access' });
    }

    const success = revokeUser(request.params.id);
    if (!success) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return { success: true };
  });

  // Admin: regenerate invite
  app.post<{ Params: { id: string } }>('/api/admin/users/:id/reinvite', async (request, reply) => {
    if (request.user?.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    const newToken = regenerateInvite(request.params.id);
    if (!newToken) {
      return reply.code(400).send({ error: 'User not found or already accepted invite' });
    }

    const baseUrl = `${request.protocol}://${request.hostname}`;
    const inviteUrl = `${baseUrl}/invite/${newToken}`;

    return { inviteUrl, token: newToken };
  });

  // Browse directories (available during setup or to admins)
  app.get<{ Querystring: { path?: string } }>('/api/browse-directories', async (request, reply) => {
    const isSetup = !isSetupComplete();
    const isAdmin = request.user?.role === 'admin';
    if (!isSetup && !isAdmin) {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    const requestedPath = request.query.path || os.homedir();
    let resolvedPath: string;
    try {
      resolvedPath = path.resolve(requestedPath);
    } catch {
      return reply.code(400).send({ error: 'Invalid path' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return reply.code(400).send({ error: 'Path does not exist' });
    }

    try {
      const stat = fs.statSync(resolvedPath);
      if (!stat.isDirectory()) {
        return reply.code(400).send({ error: 'Path is not a directory' });
      }

      const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
      const directories = entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .map(e => ({ name: e.name, path: path.join(resolvedPath, e.name) }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const parentPath = path.dirname(resolvedPath);

      // List mounted volumes/drives for quick navigation
      const volumes: { name: string; path: string }[] = [];
      try {
        // macOS: external drives at /Volumes
        if (fs.existsSync('/Volumes')) {
          const volEntries = fs.readdirSync('/Volumes', { withFileTypes: true });
          for (const v of volEntries) {
            if (v.isDirectory() || v.isSymbolicLink()) {
              volumes.push({ name: v.name, path: path.join('/Volumes', v.name) });
            }
          }
        }
        // Linux: /mnt and /media
        for (const mountRoot of ['/mnt', `/media/${os.userInfo().username}`, '/media']) {
          if (fs.existsSync(mountRoot)) {
            try {
              const mountEntries = fs.readdirSync(mountRoot, { withFileTypes: true });
              for (const m of mountEntries) {
                if (m.isDirectory()) {
                  const mPath = path.join(mountRoot, m.name);
                  if (!volumes.some(v => v.path === mPath)) {
                    volumes.push({ name: m.name, path: mPath });
                  }
                }
              }
            } catch {}
          }
        }
      } catch {}

      return {
        currentPath: resolvedPath,
        parentPath: parentPath !== resolvedPath ? parentPath : null,
        directories,
        volumes: volumes.sort((a, b) => a.name.localeCompare(b.name)),
      };
    } catch {
      return reply.code(403).send({ error: 'Cannot read directory' });
    }
  });

  // Admin: get storage config
  app.get('/api/admin/config', async (request, reply) => {
    if (request.user?.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }
    return { photosPath: getPhotosPath() };
  });

  // Admin: update storage path
  app.put<{ Body: { photosPath: string } }>('/api/admin/config', async (request, reply) => {
    if (request.user?.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    const { photosPath } = request.body;
    if (!photosPath) {
      return reply.code(400).send({ error: 'Photos path is required' });
    }

    if (!fs.existsSync(photosPath)) {
      return reply.code(400).send({ error: 'Photos path does not exist' });
    }

    setPhotosPath(photosPath);
    return { success: true, photosPath };
  });
}
