#!/usr/bin/env node
// Bootstraps the first admin user inside the running container.
// Usage (inside container):
//   node /app/scripts/create-admin.mjs --email you@example.com --name "Your Name"
// or run with no args for interactive prompts.

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// Imports resolve from /app/server/dist (compiled in the image).
const { createAdminUser } = await import('../server/dist/auth/service.js');
const { setPhotosPath, setConfig, isSetupComplete } = await import('../server/dist/admin/service.js');
const { getDb, closeDb } = await import('../server/dist/db/connection.js');
const { runMigrations } = await import('../server/dist/db/migrate.js');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') out.email = argv[++i];
    else if (a === '--name') out.name = argv[++i];
    else if (a === '--library') out.library = argv[++i];
    else if (a === '--port') out.port = argv[++i];
  }
  return out;
}

async function prompt(rl, label, fallback) {
  const suffix = fallback ? ` [${fallback}]` : '';
  const ans = (await rl.question(`${label}${suffix}: `)).trim();
  return ans || fallback || '';
}

const args = parseArgs(process.argv);

// Initialise DB (idempotent — server already did this if it's running)
getDb();
runMigrations();

if (isSetupComplete()) {
  console.error('Setup is already complete. Use the in-app admin UI to invite more users.');
  closeDb();
  process.exit(1);
}

const rl = readline.createInterface({ input, output });
try {
  const email = (args.email || (await prompt(rl, 'Admin email'))).trim().toLowerCase();
  const name = args.name || (await prompt(rl, 'Display name'));
  const library = args.library || (await prompt(rl, 'Photo library path inside container', '/library'));
  const port = args.port || process.env.PORT || '3000';

  if (!email || !name) {
    console.error('Email and display name are required.');
    process.exit(1);
  }

  const { user } = createAdminUser(email, name);
  setPhotosPath(library);
  setConfig('setup_complete', 'true');

  console.log('');
  console.log('Admin user created.');
  console.log(`  Email:        ${user.email}`);
  console.log(`  Display name: ${user.displayName}`);
  console.log(`  Library path: ${library}`);
  console.log('');
  console.log(`Open http://<host-LAN-IP>:${port}/ in any browser on your LAN`);
  console.log(`and log in with: ${user.email}`);
} finally {
  rl.close();
  closeDb();
}
