# Project Dossier

Do not load this file by default. Use it only when the user asks for broader project context, history, architecture detail, feature inventory, or later-roadmap material.

## Source Links

- `HANDOFF.md`: hot current-state context, checkpoint status, active constraints, and next actions.
- `Photo Viewer - Product Description.md`: original product concept. Treat as historically useful but stale in places; verify against code before using it as current truth.
- `IMPLEMENTATION_PLAN.md`: social/family storytelling feature plan and confirmed decisions. Useful for intent, but verify against current implementation.
- `CHANGELOG.md`: release history from `v1.0.0` through `v1.0.3`.
- `Dockerfile`, `docker-compose.yml`, `deploy/docker-compose.yml`, `deploy/README-INSTALL.md`: Docker runtime and recipient install contract.
- `.github/workflows/release.yml`: formal release workflow for multi-arch GHCR images and deploy bundle assets.

## Durable Architecture Notes

- Product shape: self-hosted family photo browsing and annotation web app, intended for one household or family network rather than multi-tenant cloud use.
- Runtime shape: one Node/Fastify server serves both API routes and the built React/Vite SPA.
- Repo shape: npm workspace monorepo with `packages/shared`, `server`, and `client`.
- Server: Fastify 5, TypeScript, SQLite via `better-sqlite3`, Drizzle schema definitions plus SQL migrations.
- Client: React 19, Vite 6, TanStack Query, react-router, lucide icons, shared TypeScript API types.
- Container: Node 20 Alpine runtime with ImageMagick, vips, and tini; runs as the non-root `node` user.
- Docker data layout: `/app/server/data` stores the SQLite DB and preview/thumbnail caches; `/library` is the mounted photo library path.
- Production SPA serving depends on `DATA_DIR=/app/server/data`; `server/src/app.ts` resolves `../../client/dist` relative to that directory.
- Supported indexed image formats currently include JPEG, TIFF, PNG, common RAW formats, PSD, and PSB.

## Feature Inventory

- Folder browsing with nested folder hierarchy.
- Gallery and viewer pages for photo navigation.
- Search and activity feed.
- Setup and admin/user management flows.
- Cookie-session auth with invite-style user lifecycle.
- Title, caption, date, story, and location editing surfaces.
- Reactions, comments, people tags, follows, notifications, and On This Day.
- Timeline sort and gallery badges for reaction/comment counts.
- Preview and thumbnail generation/caching.
- Slideshow controls and theme toggle.

## Data And Metadata Notes

- Current schema stores photo index rows, title, caption, date, location, users, activity, tags, reactions, comments, follows, notifications, and On This Day dismissals in SQLite.
- `server/src/metadata/routes.ts` still writes XMP sidecars for title, caption, and date, and writes story sidecar files for story entries.
- Docker compose mounts the library read-only at `/library`, which conflicts with sidecar-writing routes unless the runtime mount or code behavior is changed.
- `server/src/admin/service.ts` clears library-derived DB state and on-disk preview/thumbnail caches when the configured photo path changes. It preserves users, people-tag definitions, and album shells; photo-linked activity rows are cleared with the photo index because they reference indexed photo IDs.
- `photos_fts` is contentless FTS5. Deleting or updating indexed text must use the special FTS commands, not ordinary row deletion semantics.

## Docker And Release Notes

- Current version is `1.0.3`.
- Docker distribution is the main install path for recipients.
- Build Mode is the default. Do not release, publish, bump versions, edit the changelog, or create tags without explicit user intent.
- Image tags must be numbered; never use `latest`.
- Publishable distribution images must support `linux/amd64` and `linux/arm64`.
- The GitHub release workflow is triggered by `v*.*.*` tags and pushes numbered GHCR tags plus a trace tag.
- Recipient deploy bundle contains compose, `.env.example`, install scripts, upgrade scripts, and `README-INSTALL.md`.

## Historical Notes Worth Keeping

- `v1.0.0` established Docker distribution, GHCR publishing, deploy bundle, social/family storytelling features, and AppLauncher manifest support.
- `v1.0.1` hid the setup folder picker when `SETUP_LIBRARY_PATH` is set.
- `v1.0.2` locked Settings storage changes when `SETUP_LIBRARY_PATH` is set.
- `v1.0.3` clears stale library-derived state when the photos path changes in non-launcher installs.
- Current Git remote is `origin` at `git@github.com:paulmarshall-wfw/photo-viewer.git`.

## Drift And Cautions

- The product description says XMP sidecars are the metadata source of truth, while the newer handoff/release notes emphasize DB-centered behavior. Current code still writes sidecars for some metadata. Verify desired source-of-truth before changing metadata behavior.
- The Docker install contract says the library mount is read-only. Any feature that writes sidecars or story files must reconcile that with recipient deployments.
- Product description non-goals say no social features beyond stories, but current releases include reactions, comments, follows, notifications, people tags, and On This Day.
- Recipient and NAS install flows are documented but were not re-verified during the baseline handoff session.
- No dedicated root `verify` script exists yet; `npm run build` is the current baseline check.

## Deferred Ideas And Later Roadmap

- Add a single root `verify` command for routine maintenance.
- Add tests for critical server behavior before larger feature work.
- Re-run a clean recipient install from the deploy bundle before any future release.
- Reconcile metadata source-of-truth and read-only library expectations.
- Consider HTTPS/reverse-proxy support for LAN deployments.
