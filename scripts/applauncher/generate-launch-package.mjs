#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const appId = 'photo-viewer';
const appName = 'Photo Viewer';
const packageVersion = '1.0.0';
const defaultPort = 4820;
const installBase = path.join(os.homedir(), 'Library/Application Support/AppLauncher/launch-packages');

function parseArgs(argv) {
  const args = { force: false, install: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--force') args.force = true;
    else if (arg === '--install') args.install = true;
    else if (arg === '--out') {
      args.out = argv[index + 1];
      index += 1;
    } else if (arg === '--install-root') {
      args.installRoot = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`unsupported argument ${arg}`);
    }
  }
  return args;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readVersion() {
  const versionFile = fs.readFileSync(path.join(repoRoot, 'VERSION'), 'utf8').trim();
  const packageJson = readJson('package.json');
  if (packageJson.version !== versionFile) {
    throw new Error(`VERSION (${versionFile}) does not match package.json (${packageJson.version})`);
  }
  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(versionFile)) {
    throw new Error(`app version must be numbered, got ${versionFile}`);
  }
  return versionFile;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
  fs.chmodSync(filePath, 0o755);
}

function copyDirectory(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function makeWrapper(operation) {
  return `#!/bin/sh
set -eu
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
package_root="$(CDPATH= cd -- "$script_dir/.." && pwd)"
export APPLAUNCHER_PACKAGE_ROOT="\${APPLAUNCHER_PACKAGE_ROOT:-$package_root}"
exec ${JSON.stringify(process.execPath)} "$script_dir/package-control.mjs" ${JSON.stringify(operation)}
`;
}

function generatePackage(args) {
  const appVersion = readVersion();
  const packageRoot = path.resolve(args.out || path.join(repoRoot, 'dist/applauncher-launch-packages', appId, appVersion));

  if (fs.existsSync(packageRoot) && !args.force) {
    throw new Error(`package root exists; rerun with --force: ${packageRoot}`);
  }

  fs.rmSync(packageRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(packageRoot, 'config'), { recursive: true });
  fs.mkdirSync(path.join(packageRoot, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(packageRoot, 'logs'), { recursive: true });

  const manifest = {
    manifestVersion: '2.0.0',
    appId,
    appVersion,
    name: appName,
    description: 'Self-hosted family photo annotation web app launched from a target-owned container package.',
    appKind: 'containerApp',
    publisher: {
      name: 'Paul Marshall'
    },
    package: {
      id: `${appId}-launch-package`,
      version: packageVersion,
      generatedAt: new Date().toISOString(),
      generator: {
        name: 'photo-viewer-applauncher-launch-package-generator',
        version: packageVersion
      }
    },
    scripts: {
      start: 'scripts/start.sh',
      stop: 'scripts/stop.sh',
      restart: 'scripts/restart.sh',
      health: 'scripts/health.sh',
      doctor: 'scripts/doctor.sh'
    },
    health: {
      timeoutSeconds: 5,
      startupDeadlineSeconds: 120
    },
    logs: {
      directory: 'logs',
      retentionDays: 14
    },
    open: {
      url: `http://127.0.0.1:${defaultPort}/`
    }
  };

  const config = {
    schemaVersion: '2.0.0',
    appId,
    appVersion,
    appKind: 'containerApp',
    repoRoot,
    composeFile: 'deploy/docker-compose.yml',
    imageRepository: 'ghcr.io/paulmarshall-wfw/photo-viewer',
    containerName: 'photo-viewer',
    openUrl: `http://127.0.0.1:${defaultPort}/`,
    healthPath: '/api/health',
    healthTimeoutSeconds: 5,
    startupDeadlineSeconds: 120,
    envFiles: [
      'deploy/.env',
      '.env',
      'config/applauncher.env'
    ],
    defaults: {
      IMAGE_TAG: appVersion,
      PORT: String(defaultPort),
      DATA_DIR: '/app/server/data',
      SETUP_LIBRARY_PATH: '/library'
    },
    requiredConfig: [
      'LIBRARY_PATH'
    ],
    requiredSecrets: [
      'SESSION_SECRET'
    ]
  };

  writeJson(path.join(packageRoot, 'manifest.json'), manifest);
  writeJson(path.join(packageRoot, 'config/launch-package.json'), config);
  fs.copyFileSync(path.join(__dirname, 'package-control.mjs'), path.join(packageRoot, 'scripts/package-control.mjs'));
  fs.chmodSync(path.join(packageRoot, 'scripts/package-control.mjs'), 0o755);

  for (const operation of ['start', 'stop', 'restart', 'health', 'doctor']) {
    writeExecutable(path.join(packageRoot, `scripts/${operation}.sh`), makeWrapper(operation));
  }

  if (args.install) {
    const root = path.resolve(args.installRoot || installBase);
    const installPath = path.join(root, appId, appVersion);
    copyDirectory(packageRoot, installPath);
    return { packageRoot, installPath };
  }

  return { packageRoot };
}

try {
  const result = generatePackage(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
