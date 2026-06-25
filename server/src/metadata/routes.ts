import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { photos } from '../db/schema.js';
import { getPhotosPath } from '../admin/service.js';
import { writeXmpField, readXmp } from './xmp.js';
import { readStory, appendStory, editStory, deleteStory } from './story.js';
import { logActivity } from '../activity/service.js';
import { ensureFollowing } from '../follows/service.js';
import { createNotifications } from '../notifications/service.js';

function updateFtsField(photoId: string, field: 'title' | 'caption', value: string) {
  const sqlite = getSqlite();
  // Get the rowid for this photo
  const row = sqlite.prepare(`SELECT rowid FROM photos WHERE id = ?`).get(photoId) as any;
  if (!row) return;
  const photo = sqlite.prepare(`SELECT title, caption, filename, folder_path FROM photos WHERE id = ?`).get(photoId) as any;
  if (!photo) return;
  const folder = sqlite.prepare(`SELECT name FROM folders WHERE path = ?`).get(photo.folder_path) as any;
  const folderName = folder?.name || '';
  // For contentless fts5 tables, use the special 'delete' command to remove old entry
  sqlite.prepare(
    `INSERT INTO photos_fts(photos_fts, rowid, title, caption, story_text, folder_name, filename) VALUES ('delete', ?, ?, ?, '', ?, ?)`
  ).run(row.rowid, photo.title || '', photo.caption || '', folderName, photo.filename);
  // Now insert the updated entry (apply the new value)
  const newTitle = field === 'title' ? value : (photo.title || '');
  const newCaption = field === 'caption' ? value : (photo.caption || '');
  sqlite.prepare(
    `INSERT INTO photos_fts(rowid, title, caption, story_text, folder_name, filename) VALUES (?, ?, ?, '', ?, ?)`
  ).run(row.rowid, newTitle, newCaption, folderName, photo.filename);
}

function getAbsolutePhotoPath(filePath: string): string | null {
  const photosPath = getPhotosPath();
  if (!photosPath) return null;
  return path.join(photosPath, filePath);
}

function normalizeOrientation(value: unknown): 0 | 90 | 180 | 270 | null {
  if (value !== 0 && value !== 90 && value !== 180 && value !== 270) {
    return null;
  }
  return value;
}

export async function metadataRoutes(app: FastifyInstance) {
  // Update title
  app.patch<{ Params: { id: string }; Body: { title: string } }>('/api/photos/:id/title', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const absolutePath = getAbsolutePhotoPath(photo.filePath);
    if (!absolutePath) return reply.code(500).send({ error: 'Photos path not configured' });

    const { title } = request.body;
    const userName = request.user?.displayName || 'Unknown';

    writeXmpField(absolutePath, 'title', title, userName);
    updateFtsField(photo.id, 'title', title);
    db.update(photos).set({ title }).where(eq(photos.id, photo.id)).run();
    logActivity(request.user!.id, photo.id, 'set_title', JSON.stringify({ title }));
    ensureFollowing(request.user!.id, photo.id);
    createNotifications(photo.id, request.user!.id, 'set_title', title);

    return { success: true, title };
  });

  // Update caption
  app.patch<{ Params: { id: string }; Body: { caption: string } }>('/api/photos/:id/caption', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const absolutePath = getAbsolutePhotoPath(photo.filePath);
    if (!absolutePath) return reply.code(500).send({ error: 'Photos path not configured' });

    const { caption } = request.body;
    const userName = request.user?.displayName || 'Unknown';

    writeXmpField(absolutePath, 'caption', caption, userName);
    updateFtsField(photo.id, 'caption', caption);
    db.update(photos).set({ caption }).where(eq(photos.id, photo.id)).run();
    logActivity(request.user!.id, photo.id, 'set_caption', JSON.stringify({ caption }));
    ensureFollowing(request.user!.id, photo.id);
    createNotifications(photo.id, request.user!.id, 'set_caption');

    return { success: true, caption };
  });

  // Update date taken
  app.patch<{ Params: { id: string }; Body: { dateTaken: string } }>('/api/photos/:id/date', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const absolutePath = getAbsolutePhotoPath(photo.filePath);
    if (!absolutePath) return reply.code(500).send({ error: 'Photos path not configured' });

    const { dateTaken } = request.body;
    const userName = request.user?.displayName || 'Unknown';

    writeXmpField(absolutePath, 'dateTaken', dateTaken, userName);
    db.update(photos).set({ dateTaken }).where(eq(photos.id, photo.id)).run();
    logActivity(request.user!.id, photo.id, 'set_date', JSON.stringify({ dateTaken }));

    return { success: true, dateTaken };
  });

  // Get story entries for a photo
  app.get<{ Params: { id: string } }>('/api/photos/:id/story', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const absolutePath = getAbsolutePhotoPath(photo.filePath);
    if (!absolutePath) return reply.code(500).send({ error: 'Photos path not configured' });

    return { entries: readStory(absolutePath) };
  });

  // Add story entry
  app.post<{ Params: { id: string }; Body: { content: string } }>('/api/photos/:id/story', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const absolutePath = getAbsolutePhotoPath(photo.filePath);
    if (!absolutePath) return reply.code(500).send({ error: 'Photos path not configured' });

    const { content } = request.body;
    const userName = request.user?.displayName || 'Unknown';

    appendStory(absolutePath, photo.filename, userName, content);
    db.update(photos).set({ hasStory: true }).where(eq(photos.id, photo.id)).run();
    logActivity(request.user!.id, photo.id, 'add_story');
    ensureFollowing(request.user!.id, photo.id);
    createNotifications(photo.id, request.user!.id, 'add_story');

    return { success: true, entries: readStory(absolutePath) };
  });

  // Edit story entry
  app.patch<{ Params: { id: string; index: string }; Body: { content: string } }>('/api/photos/:id/story/:index', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const absolutePath = getAbsolutePhotoPath(photo.filePath);
    if (!absolutePath) return reply.code(500).send({ error: 'Photos path not configured' });

    const entryIndex = parseInt(request.params.index, 10);
    const entries = readStory(absolutePath);
    const entry = entries[entryIndex];

    // Only allow editing own entries unless admin
    if (entry && entry.author !== request.user?.displayName && request.user?.role !== 'admin') {
      return reply.code(403).send({ error: 'Can only edit your own story entries' });
    }

    const success = editStory(absolutePath, entryIndex, request.body.content);
    if (!success) return reply.code(404).send({ error: 'Story entry not found' });

    logActivity(request.user!.id, photo.id, 'edit_story');
    ensureFollowing(request.user!.id, photo.id);
    createNotifications(photo.id, request.user!.id, 'edit_story');
    return { success: true, entries: readStory(absolutePath) };
  });

  // Delete story entry
  app.delete<{ Params: { id: string; index: string } }>('/api/photos/:id/story/:index', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const absolutePath = getAbsolutePhotoPath(photo.filePath);
    if (!absolutePath) return reply.code(500).send({ error: 'Photos path not configured' });

    const entryIndex = parseInt(request.params.index, 10);
    const entries = readStory(absolutePath);
    const entry = entries[entryIndex];

    if (entry && entry.author !== request.user?.displayName && request.user?.role !== 'admin') {
      return reply.code(403).send({ error: 'Can only delete your own story entries' });
    }

    const success = deleteStory(absolutePath, entryIndex);
    if (!success) return reply.code(404).send({ error: 'Story entry not found' });

    const remaining = readStory(absolutePath);
    db.update(photos).set({ hasStory: remaining.length > 0 }).where(eq(photos.id, photo.id)).run();
    logActivity(request.user!.id, photo.id, 'delete_story');

    return { success: true, entries: remaining };
  });

  // Read XMP metadata for a photo
  app.get<{ Params: { id: string } }>('/api/photos/:id/metadata', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const absolutePath = getAbsolutePhotoPath(photo.filePath);
    if (!absolutePath) return reply.code(500).send({ error: 'Photos path not configured' });

    const xmp = readXmp(absolutePath);
    return { metadata: xmp };
  });

  // Update location (DB only, not XMP)
  app.patch<{ Params: { id: string }; Body: { location: string } }>('/api/photos/:id/location', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const location = (request.body.location ?? '').trim();
    db.update(photos).set({ location: location || null }).where(eq(photos.id, photo.id)).run();
    logActivity(request.user!.id, photo.id, 'set_location', JSON.stringify({ location }));
    ensureFollowing(request.user!.id, photo.id);
    createNotifications(photo.id, request.user!.id, 'set_location', location);

    return { success: true, location };
  });

  // Update display orientation (DB only, non-destructive)
  app.patch<{ Params: { id: string }; Body: { orientationDeg: number } }>('/api/photos/:id/orientation', async (request, reply) => {
    const db = getDb();
    const photo = db.select().from(photos).where(eq(photos.id, request.params.id)).get();
    if (!photo) return reply.code(404).send({ error: 'Photo not found' });

    const orientationDeg = normalizeOrientation(request.body.orientationDeg);
    if (orientationDeg === null) {
      return reply.code(400).send({ error: 'Orientation must be 0, 90, 180, or 270 degrees' });
    }

    db.update(photos).set({ orientationDeg }).where(eq(photos.id, photo.id)).run();
    logActivity(request.user!.id, photo.id, 'set_orientation', JSON.stringify({ orientationDeg }));

    return { success: true, orientationDeg };
  });
}
