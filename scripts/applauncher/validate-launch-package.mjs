#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const sharedValidator = '/Users/paulmarshall/Software Development/All Skills/target-app-launch-package/scripts/validate_launch_package.mjs';

function readVersion() {
  return fs.readFileSync(path.join(repoRoot, 'VERSION'), 'utf8').trim();
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function validateReport(stdout, operation) {
  const report = JSON.parse(stdout);
  if (report.schemaVersion !== '2.0.0') throw new Error(`${operation} report has wrong schemaVersion`);
  if (report.operation !== operation) throw new Error(`${operation} report has wrong operation`);
  if (!['ok', 'warning', 'error'].includes(report.status)) throw new Error(`${operation} report has unsupported status`);
  if (typeof report.ready !== 'boolean') throw new Error(`${operation} report ready must be boolean`);
  if (!Array.isArray(report.checks)) throw new Error(`${operation} report checks must be an array`);
  if (!Array.isArray(report.resources)) throw new Error(`${operation} report resources must be an array`);
  if (!Array.isArray(report.logs)) throw new Error(`${operation} report logs must be an array`);
}

const packageRoot = path.join(repoRoot, 'dist/applauncher-launch-packages/photo-viewer', readVersion());

try {
  run(process.execPath, [sharedValidator, '--package', packageRoot, '--run-doctor']);
  const healthScript = path.join(packageRoot, 'scripts/health.sh');
  const health = run(healthScript, [], { cwd: packageRoot });
  validateReport(health, 'health');
  console.log(`Valid AppLauncher 2.0 launch package: ${packageRoot}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
