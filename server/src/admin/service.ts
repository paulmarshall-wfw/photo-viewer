import { eq } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { configTable } from '../db/schema.js';

export function getConfig(key: string): string | null {
  const db = getDb();
  const row = db.select().from(configTable).where(eq(configTable.key, key)).get();
  return row?.value ?? null;
}

export function setConfig(key: string, value: string): void {
  const db = getDb();
  db.insert(configTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: configTable.key, set: { value } })
    .run();
}

export function isSetupComplete(): boolean {
  return getConfig('setup_complete') === 'true';
}

export function getPhotosPath(): string | null {
  return getConfig('photos_path');
}

export function setPhotosPath(photosPath: string): void {
  setConfig('photos_path', photosPath);
}
