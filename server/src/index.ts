import fs from 'node:fs';
import { config } from './config.js';
import { buildApp } from './app.js';
import { runMigrations } from './db/migrate.js';
import { getDb } from './db/connection.js';

async function start() {
  // Ensure data directories exist
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.previewsDir, { recursive: true });
  fs.mkdirSync(config.thumbnailsDir, { recursive: true });

  // Initialize database and run migrations
  getDb();
  runMigrations();
  console.log('Database initialized');

  // Build and start server
  const app = await buildApp();

  await app.listen({ port: config.port, host: config.host });
  console.log(`Photo Viewer server running on http://localhost:${config.port}`);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
