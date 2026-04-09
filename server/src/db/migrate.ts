import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSqlite } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations() {
  const sqlite = getSqlite();
  const migrationsDir = path.join(__dirname, '../db/migrations');

  // In dev mode (tsx), resolve from source
  const srcMigrationsDir = path.resolve(__dirname, '../../src/db/migrations');
  const dir = fs.existsSync(migrationsDir) ? migrationsDir : srcMigrationsDir;

  // Create migrations tracking table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    sqlite.prepare('SELECT name FROM _migrations').all()
      .map((row: any) => row.name)
  );

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(dir, file), 'utf-8');
    sqlite.exec(sql);
    sqlite.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    console.log(`Applied migration: ${file}`);
  }
}
