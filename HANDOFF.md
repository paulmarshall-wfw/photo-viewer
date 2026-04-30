# Photo Viewer — Project Handoff

## 1. Metadata

| Field | Value |
|-------|-------|
| Project | Photo Viewer |
| Version | 1.0.2 (published) |
| Updated | 2026-04-26 |
| Handoff type | Implementation handoff |
| Status | v1.0.0 published to GHCR; recipient install flow not yet exercised on a clean host |
| Repo | https://github.com/paulmarshall-wfw/photo-viewer |
| Image | `ghcr.io/paulmarshall-wfw/photo-viewer:1.0.2` (multi-arch: amd64 + arm64) |
| Release | https://github.com/paulmarshall-wfw/photo-viewer/releases/tag/v1.0.0 |
| Branch | main |
| Session scope | Docker packaging, GitHub repo setup, v1.0.0 release |

## 2. Executive Summary

Photo Viewer is a **self-hosted, single-tenant family photo annotation web app**, distributed as a **Docker image**. One trusted person per family runs the container on a Mac, PC, Linux box, or NAS; everyone else opens it in a browser on the same LAN. Photo originals stay on the host (read-only bind mount); comments, reactions, captions, tags, and the user database live in a SQLite file in `./data` next to the compose file.

**v1.0.0 is published.** The multi-arch image is on GHCR and the recipient deploy bundle is attached to the GitHub Release. Image pull works; manifest lists both `linux/amd64` and `linux/arm64`. The end-to-end recipient install (download zip → run `install.sh` → reach Library) has not yet been exercised on a fresh host — that's the next verification step.

The five family storytelling features (Reactions & Comments, Photo Following + Notifications, On This Day, People & Places Tagging, Timeline View) shipped earlier in the month and are working.

## 3. Current Objective

**Immediate goal:** Run the recipient install flow on a clean host (this Mac is fine) end-to-end against the published `photo-viewer-deploy.zip`. Confirm: download → extract → install.sh → admin bootstrap → log in → index a small library → view a photo → leave a comment, all under 10 minutes.

**Definition of done:**
- Fresh extraction of the published `photo-viewer-deploy.zip` boots a working Photo Viewer.
- Library, Gallery, Viewer, comments, reactions all work in that fresh install.
- Any rough edges in the recipient flow are documented and fixed for v1.0.2.

After that: onboard the first real family (Marshall household).

## 4. Current State

### Working
- Full photo browsing: Library → Gallery → Viewer
- Title, caption, date editing (DB-only — XMP writeback was dropped)
- Comments (one level of threading), Reactions (emoji, attributed), People & Places tagging, Photo Following + in-app Notifications, On This Day banner, Timeline sort with year/decade markers
- Full-text search (contentless FTS5)
- Activity feed
- Slideshow with configurable intervals + loop
- Virtual scrolling in Gallery
- Theme toggle (light/dark)
- Auth: cookie-based, invite-only, email-only login (case-insensitive)
- Image previews: JPEG, PNG, TIFF, RAW, DNG, PSD, PSB
- Read Me documentation page
- Containerised: builds clean, runs as non-root, listens on `:3000`, persists `./data` and reads `/library` read-only
- **Published**: `ghcr.io/paulmarshall-wfw/photo-viewer:1.0.2` (and `:1.0`, `:1`, `:1.0.0-g<sha>`) for `linux/amd64` and `linux/arm64`

### Not in v1
- HTTPS on the LAN — README documents `mkcert` recipe; no built-in TLS
- Map view for `location` (free text only)
- Audio narration (postponed)
- XMP writeback (dropped during social-features work — metadata lives in DB)
- Multi-tenant cloud deployment (a separate plan, `~/.claude/plans/enumerated-sleeping-simon.md`, exists if we ever go that direction; not in scope for v1)

## 5. Locked Business Rules

- **DB is source of truth** for all metadata in v1. XMP writeback was dropped — `exiftool-vendored` stays for *reading* EXIF during indexing only.
- **Photo cards show filename**, never the title.
- **No-Line Rule**: no visible borders; depth via tonal layering and ambient shadows only.
- **Pill-shaped primary buttons**: `border-radius: 9999px` with gradient backgrounds.
- **Page names are fixed**: Library, Gallery, Viewer, Search, Activity, Settings, Login, Setup, Read Me.
- **Contentless FTS5** — `photos_fts` cannot use regular DELETE. Must use the special `'delete'` command (see `updateFtsField` in `server/src/metadata/routes.ts`). Social features do not touch FTS5.
- **Notifications** never fan out to the actor.
- **Reactions** are attributed.
- **One level of comment threading** — replies cannot have their own replies.
- **"On This Day" date source**: user-assigned `dateTaken` first, EXIF fallback. Per-user dismissal in `dismissed_on_this_day`, keyed by calendar date.
- **Library mount is read-only.** The container never writes back to the photo files.
- **Never use `:latest`.** Numbered tags only — enforced by the `docker-build-and-publish` skill.

## 6. Run Commands

### Dev (host node, no Docker)

```bash
npm install
npm run build
npm start                   # production-style; serves API + client on :3000
npm run dev                 # watch mode (concurrent server + vite)
```

### Dev (Docker, builds locally)

```bash
docker compose up -d        # uses repo-root docker-compose.yml; builds photo-viewer:1.0.2
docker compose logs -f
```

### Recipient install (against published bundle)

```bash
# Download & extract photo-viewer-deploy.zip from the GitHub Release page,
# then from the extracted folder:
bash scripts/install.sh                # macOS / Linux / NAS via SSH
powershell -File scripts/install.ps1   # Windows
```

The script prompts for library path + port, generates `SESSION_SECRET`, runs `docker compose pull && up -d`, then `docker compose exec photo-viewer node /app/scripts/create-admin.mjs` to bootstrap the first admin.

### Cutting a new release

Stay in **Build Mode** by default (per the `docker-build-and-publish` skill v6.1). Release Mode requires explicit user intent. To cut v1.0.2+:

```bash
git tag -a v1.0.2 -m "Release v1.0.2"
git push origin v1.0.2
```

The `.github/workflows/release.yml` workflow builds multi-arch (`linux/amd64,linux/arm64`), pushes numbered tags `1.0.2 / 1.0 / 1 / 1.0.2-g<sha>` to `ghcr.io/paulmarshall-wfw/photo-viewer`, and attaches `photo-viewer-deploy.zip` to the release. **Workflow permissions must be set to "Read and write"** in repo Settings → Actions → General — already done.

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | npm workspaces (`packages/shared`, `server`, `client`) |
| Server | Fastify v5 + Node 20 |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| Client | React 19 + Vite 6 + TypeScript + TanStack Query v5 |
| Auth | HTTP-only cookies, invite-only, case-insensitive email login |
| Metadata | DB-only |
| EXIF reading | exiftool-vendored (read only) |
| Images | sharp + ImageMagick (PSD/PSB) |
| Container | Node 20 Alpine, ImageMagick + libvips, non-root `node` user, tini PID 1 |
| Distribution | GHCR multi-arch (amd64 + arm64); GitHub Actions release workflow; numbered tags only |
| Source hosting | GitHub: `paulmarshall-wfw/photo-viewer` (SSH remote) |
| Icons | lucide-react |
| Routing | react-router-dom v7 |
| Virtual scrolling | @tanstack/react-virtual |

## 8. Project Structure

```
packages/shared/src/   types.ts, api-types.ts, constants.ts

server/src/
  index.ts             entry point
  app.ts               Fastify app + plugins + SPA fallback
  config.ts            port, host, DATA_DIR, dbPath, cacheDir
  auth/                cookie auth + email-only login (case-insensitive)
  admin/               user management, /api/setup, browse-directories
  photos/              indexer, folder contents, photo queries, stats
  images/              thumbnail/preview pipeline (sharp + ImageMagick)
  metadata/            EXIF read, title/caption/date/location/tags
  activity/            activity feed
  search/              FTS5 search
  reactions/  comments/  tags/  follows/  notifications/  on-this-day/
  db/                  Drizzle schema + SQL migrations + connection

client/src/
  App.tsx              router, auth flow, ToastProvider
  api/client.ts        fetch-based API client
  hooks/               useAuth, useFolders, usePhotos, useTheme,
                       useReactions, useComments, usePeopleTags,
                       usePhotoFollow, useNotifications, useOnThisDay
  pages/               BrowsePage, ViewerPage, SearchPage, ActivityPage,
                       AdminPage, SetupPage, ReadmePage, etc.
  components/
    layout/            Breadcrumbs
    photos/            FolderCard, PhotoCard, ThumbnailGrid, ThumbnailStrip,
                       ReactionBar, CommentThread, PeopleTagInput
    viewer/            ImageDisplay, InfoPanel, InlineEdit,
                       FullscreenWrapper, SlideshowControls
    shared/            ErrorBoundary, FolderPicker, ProgressBar,
                       ThemeToggle, NotificationBell, OnThisDayBanner, Toast
  styles/              variables.css (tokens), global.css

# Containerisation
Dockerfile             multi-stage: Alpine builder + runtime, non-root, tini
.dockerignore
docker-compose.yml     dev/test (build: .)
scripts/
  create-admin.mjs     interactive/CLI admin bootstrap; runs inside container
deploy/                shipped to recipients as photo-viewer-deploy.zip
  docker-compose.yml   image: ghcr.io/paulmarshall-wfw/photo-viewer:${IMAGE_TAG:-1.0.0}
  .env.example
  scripts/install.sh   install.ps1  upgrade.sh  upgrade.ps1
  README-INSTALL.md    end-user setup guide (Mac/Win/Linux/Synology/QNAP)
.github/workflows/
  release.yml          multi-arch GHCR push on v*.*.* tag, numbered tags only
```

## 9. Container Layout

| Inside container | What |
|------------------|------|
| `/app/server/dist` | compiled server JS |
| `/app/server/node_modules` | production deps (sharp, better-sqlite3, fastify) |
| `/app/server/data` | **bind mount target** — SQLite DB + previews cache; persisted on host as `./data` |
| `/app/client/dist` | built React SPA (served by fastify-static) |
| `/app/scripts/create-admin.mjs` | first-run admin bootstrap |
| `/library` | **bind mount target, read-only** — host path from `LIBRARY_PATH` env |
| `node` (uid 1000) | non-root runtime user |
| `tini` | PID 1 (signal handling) |

`DATA_DIR=/app/server/data` is required because `app.ts` resolves `clientDist` as `path.resolve(DATA_DIR, '../../client/dist')`. Don't change `DATA_DIR` without updating that resolution or the static SPA stops serving.

## 10. Recent Fixes Already Landed

This session and the immediately preceding ones:

1. **Email login case-insensitive** — `loginByEmail` now `.trim().toLowerCase()`s the input before matching.
2. **fastify-static SPA fallback** — removed `wildcard: false` so `/assets/*.js` is served instead of being swallowed by the SPA `index.html` fallback.
3. **InfoPanel redesign** — Stories removed; layout reordered to `filename → file metadata → reactions → spacer → metadata fields → comments`. Date+Time side-by-side.
4. **BrowsePage header** — page title centred, breadcrumbs left, theme toggle next to settings on the right.
5. **ViewerPage header** — "Viewer" centred at top, photo title + folder pill below the divider, NotificationBell + theme toggle + settings + username + Logout in the same positions as BrowsePage.
6. **Docker packaging** — full `Dockerfile`, dev + recipient compose, install/upgrade scripts, GitHub Actions release workflow, README-INSTALL with NAS-specific walkthroughs.
7. **DATA_DIR fix during smoke test** — moved from `/app/data` to `/app/server/data` so the relative SPA path resolves correctly.
8. **GitHub repo created** at `paulmarshall-wfw/photo-viewer`; SSH key set up; Workflow Permissions set to Read+Write.
9. **v1.0.0 published** — multi-arch image on GHCR, deploy bundle attached to release.

## 11. Validation Status

| Check | Status |
|-------|--------|
| `npm run build` | ✅ Passes |
| `docker build .` | ✅ Passes (Apple Silicon, single-arch local) |
| Container starts and `/api/health` responds | ✅ |
| SPA `index.html` (700 bytes) served at `/` | ✅ |
| `/api/setup/status` returns `{needsSetup: true}` on fresh DB | ✅ |
| `create-admin.mjs --email --name --library` end-to-end | ✅ |
| Migrations run on first start | ✅ |
| Multi-arch build (amd64 + arm64) on GHA | ✅ Workflow succeeded |
| GHCR image pulls and manifest contains both arches | ✅ Verified |
| `photo-viewer-deploy.zip` attached to GitHub Release | ✅ 8.4 KB |
| Recipient install on a clean host (download zip → install.sh → log in) | ❌ **Next verification step** |
| NAS install (Synology / QNAP) | ❌ Not yet |

## 12. Files Most Likely to Matter Next

### If verifying / debugging recipient install
| File | Why |
|------|-----|
| `deploy/scripts/install.sh` / `install.ps1` | Single-command bootstrap. First place rough edges show up. |
| `deploy/README-INSTALL.md` | The doc the recipient reads. Update as you discover gaps. |
| `scripts/create-admin.mjs` | First admin user bootstrap inside the container. |
| `deploy/docker-compose.yml` | Hard-codes `ghcr.io/paulmarshall-wfw/photo-viewer`. |

### If onboarding a real family
| File | Why |
|------|-----|
| `deploy/README-INSTALL.md` | The doc the recipient reads. NAS-specific walkthroughs live here. |

### If extending features
| File | Why |
|------|-----|
| `server/src/db/schema.ts` | All Drizzle tables. |
| `server/src/db/migrations/*.sql` | Manual SQL migrations applied at startup by `migrate.ts`. |
| `server/src/notifications/service.ts` | Notification fan-out pattern (don't notify the actor). |
| `client/src/components/viewer/InfoPanel.tsx` | The largest UI surface for per-photo affordances. |

### If cutting a new release
| File | Why |
|------|-----|
| `.github/workflows/release.yml` | The release pipeline. |
| `deploy/.env.example` | The release workflow rewrites `IMAGE_TAG` here to pin the deploy bundle to the published version. |

## 13. Constraints and Non-Negotiables

- **Docker is the supported distribution channel.** No non-Docker installer story in v1.
- **Never use `:latest`.** Per the `docker-build-and-publish` skill (v6.1). Numbered tags only: `1.0.0`, `1.0`, `1`, `1.0.0-g<sha>`.
- **Stay in Build Mode by default.** Don't bump versions, edit `CHANGELOG.md`, or create git tags unless the user explicitly asks for a release.
- **Library mount is read-only.** No code path may write into `/library`.
- **Migration at startup** — new tables created via the SQL files in `server/src/db/migrations/`. Test on a copy first.
- **Contentless FTS5** — `photos_fts` requires the special `'delete'` command. Social features must not touch this table.
- **No notification fan-out to actor** — always exclude `actorId` from inserts.
- **SQLite NULLS LAST** — use the `CASE WHEN date_taken IS NULL THEN 1 ELSE 0 END` workaround.
- **Google Fonts CDN** — Space Grotesk + Plus Jakarta Sans loaded from `client/index.html`. Air-gapped installs see fallback fonts.
- **No secrets in code** — `SESSION_SECRET` env var; install script generates one.
- **GHCR image is public.** `docker pull` works without auth — keeps recipient flow simple. Re-evaluate if you ever ship something private.

## 14. Known Open Issues

1. **Image size 707 MB.** Acceptable for v1 but trim-able: vips ships in both builder and runtime, sharp prebuilds are large, exiftool ships its own perl runtime.
2. **`@vitejs` dir lingers in `/app/node_modules`** after `npm prune --omit=dev`. Cosmetic — does not affect runtime.
3. **No tests.** All validation is manual.
4. **HTTPS not built in.** README points at `mkcert`; no Caddy sidecar shipped yet.
5. **NAS UI walkthroughs in README are unverified** — written from documentation, not tested on real Synology/QNAP devices.
6. **Recipient install flow not yet exercised on a fresh host.** First gap to close.
7. **Story auto-save on unmount** — pre-existing edge case; left alone.

## 15. Risks and Cautions

- **First fresh-host install will probably surface rough edges** in `install.sh` or the README. Fix them as v1.0.2.
- **Migration corruption on existing DBs.** New migrations are additive (`CREATE TABLE IF NOT EXISTS`), but always test against a copy.
- **Recipient confusion on NAS.** Synology/QNAP UIs differ across firmware versions. Be ready to iterate the README after first real NAS install.
- **Release Mode requires explicit user intent.** Per the skill, don't auto-release on a request like "publish this" without confirming the version bump and changelog implications.

## 16. Next Actions

### Now
1. Run `bash scripts/install.sh` from a fresh extraction of the published `photo-viewer-deploy.zip` on this Mac. Time it. Note any gaps.
2. Fix gaps as v1.0.2 (re-tag, workflow republishes).

### Soon
3. Onboard the first real family (Marshall household) using the published bundle.
4. Verify NAS installs on at least one Synology and/or QNAP.
5. Add a Caddy reverse-proxy compose snippet for HTTPS as v1.1.

### Blocked
- Nothing.

### Later (P1)
- Map view for `location`.
- Face region tagging.
- Audio narration (separate spec).
- People tag merge tool.
- Weekly digest notifications.
- Cloud multi-tenant deployment (see `~/.claude/plans/enumerated-sleeping-simon.md`).

## 17. Ready-Made Prompt for Starting a New Thread

```
I'm continuing work on Photo Viewer, a self-hosted family photo annotation web app
distributed as a Docker image. v1.0.0 is published.

Read HANDOFF.md first — it has current state, container layout, release flow,
and constraints.

Key context:
- Repo:    https://github.com/paulmarshall-wfw/photo-viewer
- Image:   ghcr.io/paulmarshall-wfw/photo-viewer:1.0.2 (multi-arch amd64+arm64)
- Release: https://github.com/paulmarshall-wfw/photo-viewer/releases/tag/v1.0.0

Tech: monorepo (packages/shared + server Fastify/SQLite/Drizzle + client React 19/Vite/TanStack Query).
Distributed as a Docker image; recipients run `bash scripts/install.sh` from the deploy bundle.
Photo library bind-mounted read-only at /library; metadata DB at /app/server/data/photo-viewer.db.

Locked constraints:
- DB is source of truth for all metadata in v1; no XMP writeback
- photos_fts is contentless FTS5 — special 'delete' command, never regular DELETE
- Notifications never fan out to the actor
- One level of comment threading only
- SQLite NULLS LAST — use CASE WHEN workaround
- Library mount is read-only
- Numbered version tags only — never `latest`
- Default to Build Mode; don't enter Release Mode without explicit intent

The recipient install flow has NOT yet been exercised on a clean host. That's the
next verification step.

Tell me what you want to do — verify the install, onboard a family, fix a bug,
cut v1.0.2, or extend features.
```
