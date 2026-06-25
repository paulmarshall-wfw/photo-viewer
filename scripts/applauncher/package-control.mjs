#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const allowedOperations = new Set(['start', 'stop', 'restart', 'health', 'doctor']);
const operation = process.argv[2] || process.env.APPLAUNCHER_OPERATION_ID || 'doctor';

function packageRoot() {
  if (process.env.APPLAUNCHER_PACKAGE_ROOT) return path.resolve(process.env.APPLAUNCHER_PACKAGE_ROOT);
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function isoNow() {
  return new Date().toISOString();
}

function jsonReport(fields) {
  const report = {
    schemaVersion: '2.0.0',
    operation,
    status: fields.status,
    ready: fields.ready,
    summary: fields.summary,
    checks: fields.checks || [],
    resources: fields.resources || [],
    logs: fields.logs || [],
    timestamp: isoNow()
  };
  if (fields.openUrl) report.openUrl = fields.openUrl;
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function logPath(root, name) {
  const dir = process.env.APPLAUNCHER_PACKAGE_LOG_DIR || path.join(root, 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}

function loadConfig(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'config/launch-package.json'), 'utf8'));
}

function parseEnvFile(filePath) {
  const values = {};
  if (!fs.existsSync(filePath)) return values;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function loadLaunchEnv(config) {
  const merged = { ...(config.defaults || {}) };
  const loadedFiles = [];
  for (const relative of config.envFiles || []) {
    const filePath = path.resolve(config.repoRoot, relative);
    if (!fs.existsSync(filePath)) continue;
    Object.assign(merged, parseEnvFile(filePath));
    loadedFiles.push(relative);
  }
  return { env: merged, loadedFiles };
}

function redactor(env) {
  const sensitive = ['SESSION_SECRET'];
  const values = sensitive.map((key) => env[key]).filter((value) => typeof value === 'string' && value.length > 0);
  return (text) => values.reduce((acc, value) => acc.split(value).join('[redacted]'), text || '');
}

function runCommand(command, args, options, redact) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8'
  });
  const output = [
    `$ ${command} ${args.join(' ')}`,
    result.stdout ? redact(result.stdout) : '',
    result.stderr ? redact(result.stderr) : ''
  ].filter(Boolean).join('\n');
  if (options.logFile) {
    fs.appendFileSync(options.logFile, `${new Date().toISOString()}\n${output}\n\n`);
  }
  return result;
}

function dockerCompose(config, env, args, logFile) {
  const childEnv = {
    ...process.env,
    ...env
  };
  const redact = redactor(env);
  return runCommand('docker', ['compose', '-f', path.resolve(config.repoRoot, config.composeFile), ...args], {
    cwd: config.repoRoot,
    env: childEnv,
    logFile
  }, redact);
}

function numberedVersion(value) {
  return /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(value || '');
}

function isPlaceholderSecret(value) {
  if (!value) return true;
  const lowered = value.toLowerCase();
  return lowered.includes('change-me') || lowered.includes('default-secret') || lowered.length < 32;
}

function checkFileReadable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function checkPortOpen(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function healthUrl(config, env) {
  const port = Number.parseInt(env.PORT || config.defaults?.PORT || '4820', 10);
  return new URL(`http://127.0.0.1:${port}${config.healthPath || '/api/health'}`);
}

function httpHealth(config, env) {
  const url = healthUrl(config, env);
  const timeout = Number(config.healthTimeoutSeconds || 5) * 1000;
  return new Promise((resolve) => {
    const request = http.get(url, { timeout }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 300);
    });
    request.once('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.once('error', () => resolve(false));
  });
}

async function waitForHealth(config, env) {
  const deadline = Date.now() + Number(config.startupDeadlineSeconds || 120) * 1000;
  while (Date.now() < deadline) {
    if (await httpHealth(config, env)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return false;
}

function buildChecks(root, config, envState, options = {}) {
  const { env, loadedFiles } = envState;
  const checks = [];

  const add = (check) => checks.push(check);
  add({
    id: 'package-config',
    label: 'Package config',
    status: config.schemaVersion === '2.0.0' ? 'ok' : 'error',
    category: 'package',
    severity: config.schemaVersion === '2.0.0' ? 'info' : 'error',
    blocking: config.schemaVersion !== '2.0.0',
    summary: config.schemaVersion === '2.0.0' ? 'Package config is readable.' : 'Package config schema is invalid.',
    remediation: config.schemaVersion === '2.0.0' ? undefined : 'Regenerate the AppLauncher package.'
  });

  add({
    id: 'repo-root',
    label: 'Repo root',
    status: fs.existsSync(config.repoRoot) ? 'ok' : 'error',
    category: 'configuration',
    severity: fs.existsSync(config.repoRoot) ? 'info' : 'error',
    blocking: !fs.existsSync(config.repoRoot),
    summary: fs.existsSync(config.repoRoot) ? 'Repo root exists.' : 'Repo root is missing.',
    remediation: fs.existsSync(config.repoRoot) ? undefined : 'Regenerate the package from the current Photo Viewer repo path.'
  });

  const composePath = path.resolve(config.repoRoot, config.composeFile || '');
  add({
    id: 'compose-file',
    label: 'Compose file',
    status: checkFileReadable(composePath) ? 'ok' : 'error',
    category: 'configuration',
    severity: checkFileReadable(composePath) ? 'info' : 'error',
    blocking: !checkFileReadable(composePath),
    summary: checkFileReadable(composePath) ? 'Docker Compose file is readable.' : 'Docker Compose file is missing or unreadable.',
    remediation: checkFileReadable(composePath) ? undefined : 'Restore deploy/docker-compose.yml or regenerate the package.'
  });

  add({
    id: 'config-files',
    label: 'Config files',
    status: loadedFiles.length > 0 ? 'ok' : 'warning',
    category: 'configuration',
    severity: loadedFiles.length > 0 ? 'info' : 'warning',
    blocking: false,
    summary: loadedFiles.length > 0 ? `${loadedFiles.length} machine-local config file(s) loaded.` : 'Only package defaults are available.',
    remediation: loadedFiles.length > 0 ? undefined : 'Create config/applauncher.env from config/applauncher.env.example.'
  });

  const libraryPath = env.LIBRARY_PATH;
  const libraryOk = typeof libraryPath === 'string' && libraryPath.length > 0 && fs.existsSync(libraryPath) && checkFileReadable(libraryPath);
  add({
    id: 'library-path',
    label: 'Photo library path',
    status: libraryOk ? 'ok' : 'error',
    category: 'storage',
    severity: libraryOk ? 'info' : 'error',
    blocking: !libraryOk,
    summary: libraryOk ? 'Photo library path is configured and readable.' : 'Photo library path is missing or unreadable.',
    remediation: libraryOk ? undefined : 'Set LIBRARY_PATH in config/applauncher.env to a readable absolute folder path.'
  });

  const secretOk = !isPlaceholderSecret(env.SESSION_SECRET);
  add({
    id: 'session-secret',
    label: 'Session secret',
    status: secretOk ? 'ok' : 'error',
    category: 'security',
    severity: secretOk ? 'info' : 'error',
    blocking: !secretOk,
    summary: secretOk ? 'Session secret is present.' : 'Session secret is missing, too short, or still a placeholder.',
    remediation: secretOk ? undefined : 'Set SESSION_SECRET in config/applauncher.env to a random 32+ character value.'
  });

  const port = Number.parseInt(env.PORT || '', 10);
  const portOk = Number.isInteger(port) && port > 0 && port < 65536;
  add({
    id: 'host-port',
    label: 'Host port',
    status: portOk ? 'ok' : 'error',
    category: 'network',
    severity: portOk ? 'info' : 'error',
    blocking: !portOk,
    summary: portOk ? 'Host port is configured.' : 'Host port is invalid.',
    remediation: portOk ? undefined : 'Set PORT to a valid TCP port number.'
  });

  const tagOk = numberedVersion(env.IMAGE_TAG);
  add({
    id: 'image-tag',
    label: 'Image tag',
    status: tagOk ? 'ok' : 'error',
    category: 'version',
    severity: tagOk ? 'info' : 'error',
    blocking: !tagOk,
    summary: tagOk ? 'Image tag is numbered.' : 'Image tag is not a numbered version.',
    remediation: tagOk ? undefined : 'Set IMAGE_TAG to a numbered version such as 1.0.4.'
  });

  if (options.includeDocker !== false) {
    const dockerVersion = runCommand('docker', ['--version'], { cwd: root, env: process.env }, (text) => text);
    add({
      id: 'docker-cli',
      label: 'Docker CLI',
      status: dockerVersion.status === 0 ? 'ok' : 'error',
      category: 'dependencies',
      severity: dockerVersion.status === 0 ? 'info' : 'error',
      blocking: dockerVersion.status !== 0,
      summary: dockerVersion.status === 0 ? 'Docker CLI is available.' : 'Docker CLI is not available.',
      remediation: dockerVersion.status === 0 ? undefined : 'Install Docker Desktop or Docker Engine with Compose support.'
    });

    const composeVersion = runCommand('docker', ['compose', 'version'], { cwd: root, env: process.env }, (text) => text);
    add({
      id: 'docker-compose',
      label: 'Docker Compose',
      status: composeVersion.status === 0 ? 'ok' : 'error',
      category: 'dependencies',
      severity: composeVersion.status === 0 ? 'info' : 'error',
      blocking: composeVersion.status !== 0,
      summary: composeVersion.status === 0 ? 'Docker Compose is available.' : 'Docker Compose is not available.',
      remediation: composeVersion.status === 0 ? undefined : 'Install a Docker version that supports docker compose.'
    });

    const dockerInfo = runCommand('docker', ['info'], { cwd: root, env: process.env }, (text) => text);
    add({
      id: 'docker-daemon',
      label: 'Docker daemon',
      status: dockerInfo.status === 0 ? 'ok' : 'error',
      category: 'runtime',
      severity: dockerInfo.status === 0 ? 'info' : 'error',
      blocking: dockerInfo.status !== 0,
      summary: dockerInfo.status === 0 ? 'Docker daemon is reachable.' : 'Docker daemon is not reachable.',
      remediation: dockerInfo.status === 0 ? undefined : 'Start Docker and rerun doctor.'
    });
  }

  return checks;
}

function blockingFailures(checks) {
  return checks.filter((check) => check.blocking && check.status !== 'ok');
}

function reportFromChecks(checks, okSummary, errorSummary, extra = {}) {
  const blockers = blockingFailures(checks);
  jsonReport({
    status: blockers.length === 0 ? 'ok' : 'error',
    ready: blockers.length === 0,
    summary: blockers.length === 0 ? okSummary : errorSummary,
    checks,
    ...extra
  });
}

async function runHealth(root, config, envState) {
  const healthy = await httpHealth(config, envState.env);
  const url = healthUrl(config, envState.env);
  jsonReport({
    status: healthy ? 'ok' : 'warning',
    ready: healthy,
    summary: healthy ? 'Photo Viewer health endpoint is responding.' : 'Photo Viewer health endpoint is not responding.',
    openUrl: config.openUrl,
    checks: [{
      id: 'health-endpoint',
      label: 'Health endpoint',
      status: healthy ? 'ok' : 'warning',
      category: 'runtime',
      severity: healthy ? 'info' : 'warning',
      blocking: false,
      summary: healthy ? 'Health endpoint returned a successful response.' : 'Health endpoint did not return a successful response.',
      remediation: healthy ? undefined : 'Start Photo Viewer or inspect the package operation logs.'
    }],
    resources: [{
      id: 'photo-viewer-http',
      kind: 'http',
      status: healthy ? 'running' : 'stopped',
      summary: `${url.origin}${url.pathname}`
    }],
    logs: [{ path: path.relative(root, logPath(root, 'applauncher-health.log')), label: 'Health log' }]
  });
}

async function runStart(root, config, envState) {
  const logFile = logPath(root, 'applauncher-start.log');
  const checks = buildChecks(root, config, envState);
  if (blockingFailures(checks).length > 0) {
    reportFromChecks(checks, 'Photo Viewer is ready to start.', 'Photo Viewer is missing required launch configuration.', {
      logs: [{ path: path.relative(root, logFile), label: 'Start log' }]
    });
    return;
  }

  const result = dockerCompose(config, envState.env, ['up', '-d'], logFile);
  if (result.status !== 0) {
    jsonReport({
      status: 'error',
      ready: false,
      summary: 'Docker Compose failed to start Photo Viewer.',
      checks,
      logs: [{ path: path.relative(root, logFile), label: 'Start log' }]
    });
    return;
  }

  const healthy = await waitForHealth(config, envState.env);
  jsonReport({
    status: healthy ? 'ok' : 'warning',
    ready: healthy,
    summary: healthy ? 'Photo Viewer started and is healthy.' : 'Photo Viewer started, but health is not ready yet.',
    openUrl: config.openUrl,
    checks,
    resources: [{
      id: config.containerName || 'photo-viewer',
      kind: 'container',
      status: healthy ? 'running' : 'unknown',
      summary: healthy ? 'Container is reachable through the health endpoint.' : 'Container start command completed; health is pending.'
    }],
    logs: [{ path: path.relative(root, logFile), label: 'Start log' }]
  });
}

function stopEnv(config, env) {
  return {
    ...(config.defaults || {}),
    ...env,
    LIBRARY_PATH: env.LIBRARY_PATH || '/tmp/photo-viewer-stop-placeholder',
    SESSION_SECRET: env.SESSION_SECRET || 'redacted-stop-only-placeholder-secret'
  };
}

async function runStop(root, config, envState) {
  const logFile = logPath(root, 'applauncher-stop.log');
  const env = stopEnv(config, envState.env);
  const result = dockerCompose(config, env, ['stop'], logFile);
  jsonReport({
    status: result.status === 0 ? 'ok' : 'error',
    ready: false,
    summary: result.status === 0 ? 'Photo Viewer stop command completed.' : 'Docker Compose failed to stop Photo Viewer.',
    checks: [],
    resources: [{
      id: config.containerName || 'photo-viewer',
      kind: 'container',
      status: result.status === 0 ? 'stopped' : 'unknown',
      summary: result.status === 0 ? 'Stop command completed.' : 'Stop command failed.'
    }],
    logs: [{ path: path.relative(root, logFile), label: 'Stop log' }]
  });
}

async function runRestart(root, config, envState) {
  const logFile = logPath(root, 'applauncher-restart.log');
  const checks = buildChecks(root, config, envState);
  if (blockingFailures(checks).length > 0) {
    reportFromChecks(checks, 'Photo Viewer is ready to restart.', 'Photo Viewer is missing required launch configuration.', {
      logs: [{ path: path.relative(root, logFile), label: 'Restart log' }]
    });
    return;
  }
  dockerCompose(config, stopEnv(config, envState.env), ['stop'], logFile);
  const result = dockerCompose(config, envState.env, ['up', '-d'], logFile);
  const healthy = result.status === 0 && await waitForHealth(config, envState.env);
  jsonReport({
    status: result.status === 0 ? (healthy ? 'ok' : 'warning') : 'error',
    ready: healthy,
    summary: result.status === 0 ? (healthy ? 'Photo Viewer restarted and is healthy.' : 'Photo Viewer restarted, but health is not ready yet.') : 'Docker Compose failed to restart Photo Viewer.',
    openUrl: config.openUrl,
    checks,
    resources: [{
      id: config.containerName || 'photo-viewer',
      kind: 'container',
      status: healthy ? 'running' : 'unknown',
      summary: healthy ? 'Container is reachable through the health endpoint.' : 'Restart command completed; health is pending or failed.'
    }],
    logs: [{ path: path.relative(root, logFile), label: 'Restart log' }]
  });
}

async function main() {
  if (!allowedOperations.has(operation)) {
    jsonReport({
      status: 'error',
      ready: false,
      summary: `Unsupported operation: ${operation}`,
      checks: [],
      resources: [],
      logs: []
    });
    process.exitCode = 1;
    return;
  }

  const root = packageRoot();
  const config = loadConfig(root);
  const envState = loadLaunchEnv(config);

  if (operation === 'doctor') {
    const checks = buildChecks(root, config, envState);
    reportFromChecks(checks, 'Photo Viewer launch package is ready.', 'Photo Viewer launch package has blocking issues.');
  } else if (operation === 'health') {
    await runHealth(root, config, envState);
  } else if (operation === 'start') {
    await runStart(root, config, envState);
  } else if (operation === 'stop') {
    await runStop(root, config, envState);
  } else if (operation === 'restart') {
    await runRestart(root, config, envState);
  }
}

main().catch((error) => {
  jsonReport({
    status: 'error',
    ready: false,
    summary: error instanceof Error ? error.message : String(error),
    checks: [],
    resources: [],
    logs: []
  });
  process.exitCode = 1;
});
