import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb } from '../db/connection.js';
import { users } from '../db/schema.js';

export function createAdminUser(email: string, displayName: string): { user: typeof users.$inferSelect; sessionToken: string } {
  const db = getDb();
  const id = nanoid();
  const sessionToken = nanoid(32);
  const now = new Date().toISOString();

  db.insert(users).values({
    id,
    email,
    displayName,
    role: 'admin',
    sessionToken,
    inviteAcceptedAt: now,
    createdAt: now,
  }).run();

  const user = db.select().from(users).where(eq(users.id, id)).get()!;
  return { user, sessionToken };
}

export function createInvite(email: string): { token: string; userId: string } {
  const db = getDb();
  const id = nanoid();
  const inviteToken = nanoid(32);
  const now = new Date().toISOString();

  db.insert(users).values({
    id,
    email,
    role: 'user',
    inviteToken,
    createdAt: now,
  }).run();

  return { token: inviteToken, userId: id };
}

export function regenerateInvite(userId: string): string | null {
  const db = getDb();
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.inviteAcceptedAt) return null;

  const newToken = nanoid(32);
  db.update(users).set({ inviteToken: newToken }).where(eq(users.id, userId)).run();
  return newToken;
}

export function acceptInvite(token: string, displayName: string): { user: typeof users.$inferSelect; sessionToken: string } | null {
  const db = getDb();
  const user = db.select().from(users).where(eq(users.inviteToken, token)).get();
  if (!user || user.revokedAt) return null;

  const sessionToken = nanoid(32);
  const now = new Date().toISOString();

  db.update(users).set({
    displayName,
    sessionToken,
    inviteToken: null,
    inviteAcceptedAt: now,
  }).where(eq(users.id, user.id)).run();

  const updated = db.select().from(users).where(eq(users.id, user.id)).get()!;
  return { user: updated, sessionToken };
}

export function validateSession(sessionToken: string): typeof users.$inferSelect | null {
  const db = getDb();
  const user = db.select().from(users).where(eq(users.sessionToken, sessionToken)).get();
  if (!user || user.revokedAt) return null;
  return user;
}

export function revokeUser(userId: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(users)
    .set({ revokedAt: now, sessionToken: null })
    .where(eq(users.id, userId))
    .run();
  return result.changes > 0;
}

export function getAllUsers() {
  const db = getDb();
  return db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
    inviteAcceptedAt: users.inviteAcceptedAt,
    revokedAt: users.revokedAt,
    createdAt: users.createdAt,
    hasInviteToken: users.inviteToken,
  }).from(users).all().map(u => ({
    ...u,
    hasPendingInvite: !!u.hasInviteToken && !u.inviteAcceptedAt,
    hasInviteToken: undefined,
  }));
}

export function loginByEmail(email: string): { user: typeof users.$inferSelect; sessionToken: string } | null {
  const db = getDb();
  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user || user.revokedAt || !user.inviteAcceptedAt) return null;

  const sessionToken = nanoid(32);
  db.update(users).set({ sessionToken }).where(eq(users.id, user.id)).run();

  const updated = db.select().from(users).where(eq(users.id, user.id)).get()!;
  return { user: updated, sessionToken };
}

export function logoutUser(sessionToken: string): boolean {
  const db = getDb();
  const result = db.update(users)
    .set({ sessionToken: null })
    .where(eq(users.sessionToken, sessionToken))
    .run();
  return result.changes > 0;
}
