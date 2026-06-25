# AppLauncher 2.0 Launch Package

Photo Viewer owns its AppLauncher launch package. AppLauncher discovers the installed package, reads `manifest.json`, invokes package-relative scripts, and parses the JSON report printed by each script.

## Package Identity

- App ID: `photo-viewer`
- App kind: `containerApp`
- Version source: `VERSION` and root `package.json`
- Generated package path: `dist/applauncher-launch-packages/photo-viewer/1.0.4/`
- Active install path: `~/Library/Application Support/AppLauncher/launch-packages/photo-viewer/1.0.4/`
- Open URL: `http://127.0.0.1:4820/`
- Health endpoint: `http://127.0.0.1:4820/api/health`

## Commands

```bash
npm run applauncher:generate
npm run applauncher:validate
npm run applauncher:install
```

Generation creates a complete launch package with:

```text
manifest.json
config/launch-package.json
scripts/start.sh
scripts/stop.sh
scripts/restart.sh
scripts/health.sh
scripts/doctor.sh
scripts/package-control.mjs
logs/
```

The generated `manifest.json` contains only AppLauncher package metadata, package-relative script paths, health timing, logs, and the open URL. Docker compose details, repo paths, config files, and app environment values live in package config and scripts.

## App-Owned Config

The package scripts assemble the runtime environment from documented Photo Viewer config files. Values are loaded in this order, with later files taking precedence:

```text
deploy/.env
.env
config/applauncher.env
```

Use `config/applauncher.env.example` as the AppLauncher-specific template. `config/applauncher.env`, `deploy/.env`, and root `.env` are machine-local files and must not be committed.

Required values:

- `LIBRARY_PATH`: absolute host path to the photo library; mounted read-only at `/library`.
- `SESSION_SECRET`: 32+ character cookie signing secret.

Defaulted non-secret values:

- `IMAGE_TAG=1.0.4`
- `PORT=4820`

The package scripts pass the merged environment directly to Docker Compose. They do not print raw config values or secrets.

## Doctor Checks

`doctor` reports whether required config and secrets are present, whether Docker and Docker Compose are usable, whether the compose file exists, whether the photo library path is readable, and whether the image tag is numbered. It reports presence and remediation only; it does not print secret values.

## Logs

Package operation logs are written under the package-local `logs/` directory. Script stdout is reserved for the single AppLauncher report JSON envelope with `schemaVersion: "2.0.0"`.
