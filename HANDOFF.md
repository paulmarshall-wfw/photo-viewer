# Handoff

## 1. Metadata

| Field | Value |
| --- | --- |
| Project | Photo Viewer |
| Handoff type | baseline / maintenance handoff |
| Created UTC | 2026-05-13T06:14:31Z |
| Prepared by | Codex |
| Repository | `/Users/paulmarshall/Software Development/Photo Viewer` |
| Branch / context | `main` tracking `origin/main` |
| Session scope | Folder review, Git repo confirmation, Docker-app baseline handoff |

### Checkpoint Status

- Git repository: confirmed at `/Users/paulmarshall/Software Development/Photo Viewer`
- Git HEAD: `9b425ce`
- Working tree: dirty
- Dirty files intentionally in scope:
  - `HANDOFF.md`
- Dirty files intentionally out of scope:
  - None
- Untracked files intentionally in scope:
  - project-dossier.md
- Untracked files intentionally out of scope:
  - AGENTS.md
- Canonical files described:
  - `package.json`
  - `VERSION`
  - `Dockerfile`
  - `docker-compose.yml`
  - `deploy/docker-compose.yml`
  - `deploy/.env.example`
  - `deploy/README-INSTALL.md`
  - `.github/workflows/release.yml`
  - `CHANGELOG.md`
  - `project-dossier.md`
- Last verification:
  - command: `npm run build`
  - result: passed
  - timestamp UTC: `2026-05-13T06:14:31Z`
- Handoff freshness: `fresh-to-dirty-tree`
- Safe-to-continue basis: this file is grounded in the current folder contents, current Git state, and a passing root production build.
- Next checkpoint action: decide whether `AGENTS.md` should be tracked, then commit the handoff baseline if desired.

Note: `AGENTS.md` was present before this handoff rewrite and is intentionally not changed here.

## 2. Executive Summary

Photo Viewer is a self-hosted, single-tenant family photo annotation web app distributed as a Docker app. The runtime model is a Node/Fastify API plus a built React/Vite client served from the same container on port `3000`.

The repo is already a Git repository and is connected to `origin` at `git@github.com:paulmarshall-wfw/photo-viewer.git`. Current version sources agree on `1.0.3` (`VERSION`, root `package.json`, workspace package manifests, deploy defaults, and changelog).

The current baseline is safe to continue from for normal development and Docker build-mode work. This session did not perform a Docker build, publish, version bump, changelog update, tag, or release.

Broader project context is in `project-dossier.md`; do not load it unless needed for architecture, history, feature inventory, or roadmap context.

## 3. Current Objective

Immediate goal: preserve a concise repo baseline so future work can start from the actual folder state instead of stale chat context.

Definition of done for this baseline:

- Confirm the folder is a Git repo.
- Record the app shape, Docker distribution path, version source, and key commands.
- Record current verification and dirty-tree state.
- Keep release behavior out of scope unless explicitly requested later.

## 4. Current State

### Working

- Git repo exists at the workspace root; branch is `main`, tracking `origin/main`.
- Root `npm run build` passes.
- Monorepo shape is established with npm workspaces:
  - `packages/shared`
  - `server`
  - `client`
- Server stack: Node 20 target, Fastify 5, SQLite via `better-sqlite3`, Drizzle schema/migrations, cookie auth.
- Client stack: React 19, Vite 6, TypeScript, TanStack Query, react-router, lucide icons.
- Docker app packaging is present:
  - `Dockerfile` builds the workspaces and runs a non-root Node Alpine runtime with ImageMagick, vips, and tini.
  - Root `docker-compose.yml` builds a local image for dev/test use.
  - `deploy/docker-compose.yml` pulls the published GHCR image for recipient installs.
  - `deploy/scripts/install.*` and `deploy/scripts/upgrade.*` support recipient setup and upgrades.
- Release workflow exists at `.github/workflows/release.yml` and is tag-triggered for `v*.*.*`; it builds and pushes `linux/amd64` and `linux/arm64` numbered GHCR tags and attaches `photo-viewer-deploy.zip`.

### Partially Working

- Recipient/NAS install docs and scripts exist, but this session did not re-run a fresh-host install.
- Docker image publication is documented and wired through GitHub Actions, but this session did not verify the live GHCR image or release asset.

### Not Working Yet

- No current failing area was identified during the folder review.

### Not Yet Verified

- `docker build .`
- `docker compose up`
- `/api/health` from a running container
- Fresh recipient install from `photo-viewer-deploy.zip`
- NAS-specific Synology/QNAP flows

## 5. Active Constraints

- This is a Docker app; keep container behavior central when changing runtime, install, release, or distribution paths.
- Default to Docker Build Mode unless the user explicitly asks for release behavior.
- Never use `latest`; use numbered image tags only.
- Do not bump versions, edit `CHANGELOG.md`, create Git tags, or publish images unless the user explicitly asks for release/distribution work.
- Publishable distribution images must support both `linux/amd64` and `linux/arm64`.
- Current version is `1.0.3`.
- The app stores runtime DB/cache data under `/app/server/data` in the container and expects a read-only photo library mount at `/library`.
- `DATA_DIR=/app/server/data` matters because `server/src/app.ts` resolves the production client bundle relative to `DATA_DIR`.
- Photo originals must remain read-only; comments, reactions, tags, metadata, users, and cache data live in SQLite/data storage.
- Keep secrets out of source: `.env` is ignored, `deploy/.env.example` is the checked-in template, and `SESSION_SECRET` is injected/generated.

## 6. Commands and Verification

Install dependencies:

```bash
npm install
```

Run local dev server:

```bash
npm run dev
```

Build all workspaces:

```bash
npm run build
```

Run production-style host Node server after build:

```bash
npm start
```

Build/run local Docker compose:

```bash
docker compose up -d
docker compose logs -f
```

Recipient install flow from extracted deploy bundle:

```bash
bash scripts/install.sh
```

Latest verified command in this session:

```bash
npm run build
```

Result: passed. The build compiled shared, client, and server workspaces and produced the Vite production client bundle.

## 7. Files to Open First

- `AGENTS.md`: local repo instructions; currently untracked.
- `package.json`: root workspaces and main scripts.
- `VERSION`: primary visible version source.
- `Dockerfile`: image build and runtime layout.
- `docker-compose.yml`: local dev/test container wiring.
- `deploy/docker-compose.yml`: recipient image, mounts, and env contract.
- `deploy/.env.example`: install-time configuration defaults.
- `deploy/README-INSTALL.md`: recipient and NAS setup guide.
- `.github/workflows/release.yml`: release-only multi-arch GHCR workflow.
- `server/src/config.ts`: runtime paths and environment variables.
- `server/src/app.ts`: route registration, health check, and static client serving.
- `client/src/App.tsx`: top-level client routing/auth shell.
- `packages/shared/src/api-types.ts`: shared API contracts.

## 8. Next Actions

### Next

1. Decide whether to add and commit the untracked `AGENTS.md`.
2. Commit this `HANDOFF.md` baseline and `project-dossier.md` if the repo should preserve them as the new starting point.
3. If the next task touches Docker runtime behavior, run `docker build .` or `docker compose up -d` and verify `/api/health`.

### Blocked

- Nothing is currently blocked.

### Later

- Add a single root `verify` script if this repo needs a standard maintenance command beyond `npm run build`.
- Consider adding tests for critical server behavior before larger feature work.
- Re-run a recipient install from the deploy bundle before any future release.

## 9. Ready-Made Prompt for Starting a New Thread

```text
Read HANDOFF.md first and treat it as the hot-context baseline for Photo Viewer.

This is a Docker-distributed family photo annotation web app in a Git repo at
/Users/paulmarshall/Software Development/Photo Viewer. Start by checking the
current Git status and opening the files listed in "Files to Open First".

Default to Docker Build Mode. Do not bump versions, edit the changelog, create
Git tags, publish images, or use latest tags unless I explicitly ask for release
or distribution work. Distinguish confirmed current state from new recommendations.
```
