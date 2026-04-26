# Photo Viewer — Project Handoff

## 1. Metadata

| Field | Value |
|-------|-------|
| Project | Photo Viewer |
| Version | 1.0.0 |
| Updated | 2026-04-26 |
| Handoff type | Implementation handoff |
| Status | Feature-complete; Docker packaging done; ready to publish v1.0.0 to GHCR |
| Branch | main |
| Session scope | Docker packaging for self-install on a single LAN |

## 2. Executive Summary

Photo Viewer is a **self-hosted, single-tenant family photo annotation web app**, distributed as a **Docker image**. One trusted person per family runs the container on a Mac, PC, Linux box, or NAS that already runs Docker; everyone else opens it in a browser on the same LAN. Photo originals stay on the host (read-only bind mount); comments, reactions, captions, tags, and the user database live in a SQLite file in `./data` next to the compose file.

The app is feature-complete at v1.0.0 — all five family storytelling features (Reactions & Comments, Photo Following & Notifications, On This Day, People & Places Tagging, Timeline View) shipped earlier this month, and this session added the full Docker packaging layer: `Dockerfile`, dev compose, recipient-facing `deploy/` bundle, install/upgrade scripts for macOS/Linux/Windows, and a GitHub Actions release workflow for multi-arch publish to GHCR. The image was built and smoke-tested locally; nothing has been pushed yet.

## 3. Current Objective

**Immediate goal:** Publish v1.0.0 — push a `v1.0.0` git tag, let the release workflow build & publish the multi-arch image to GHCR, and verify the deploy bundle on at least one fresh host (Apple Silicon Mac).

**Definition of done:**
- `ghcr.io/paulmarshall-wfw/photo-viewer:1.0.0` exists for both `linux/amd64` and `linux/arm64`.
- `photo-viewer-deploy.zip` is attached to the GitHub Release.
- A clean Mac runs `bash scripts/install.sh` against the bundle and reaches the Library page in under 10 minutes.

## 4. Current State

### Working
- Full photo browsing: Library → Gallery → Viewer
- Title, caption, date editing (DB-only — XMP writeback was dropped during the social features build to simplify the multi-user story)
- Comments (one level of threading), Reactions (emoji, attributed), People & Places tagging, Photo Following + in-app Notifications, On This Day banner, Timeline sort with year/decade markers
- Full-text search (contentless FTS5)
- Activity feed
- Slideshow with configurable intervals + loop
- Virtual scrolling in Gallery
- Theme toggle (light/dark)
- Auth: cookie-based, invite-only, email-only login (case-insensitive after the recent fix)
- Image previews: JPEG, PNG, TIFF, RAW, DNG, PSD, PSB
- Read Me documentation page
- Containerised: builds clean, runs as non-root, listens on `:3000`, persists `./data` and reads `/library` read-only

### Not in v1
- HTTPS on the LAN — README documents `mkcert` recipe; no built-in TLS
- Map view for `location` (free text only)
- Audio narration (postponed)
- XMP writeback (dropped during social-features work — metadata lives in DB)
- Multi-tenant cloud deployment (a separate plan, `enumerated-sleeping-simon.md`, exists if we ever go that direction; not in scope for v1)

## 5. Locked Business Rules

- **DB is source of truth** for all metadata in v1 (title, caption, date, location, tags, reactions, comments). XMP writeback was dropped — `exiftool-vendored` stays for *reading* EXIF during indexing only.
- **Photo cards show filename**, never the title.
- **No-Line Rule**: no visible borders; depth via tonal layering and ambient shadows only.
- **Pill-shaped primary buttons**: `border-radius: 9999px` with gradient backgrounds.
- **Page names are fixed**: Library, Gallery, Viewer, Search, Activity, Settings, Login, Setup, Read Me.
- **Contentless FTS5** — `photos_fts` cannot use regular DELETE. Must use the special `'delete'` command (see `updateFtsField` in `server/src/metadata/routes.ts`). Social features do not touch FTS5.
- **Notifications** never fan out to the actor.
- **Reactions** are attributed (show who reacted, not just a count).
- **One level of comment threading** — replies cannot have their own replies.
- **"On This Day" date source**: user-assigned `dateTaken` first, EXIF fallback. Per-user dismissal lives in `dismissed_on_this_day`, keyed by calendar date.
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
docker compose up -d        # uses repo-root docker-compose.yml; builds photo-viewer:1.0.0
docker compose logs -f
```

### Distribute / install (recipient flow)

Recipient downloads `photo-viewer-deploy.zip` from the GitHub Release, extracts, and runs:

```bash
bash scripts/install.sh                # macOS / Linux / NAS via SSH
powershell -File scripts/install.ps1   # Windows
```

The script prompts for library path + port, generates `SESSION_SECRET`, `docker compose pull && up -d`, then `docker compose exec photo-viewer node /app/scripts/create-admin.mjs` to bootstrap the first admin.

### Publish (release flow — Build Mode skill defaults)

Stays in **Build Mode** by default per the `docker-build-and-publish` skill. To enter Release Mode:

```bash
git tag v1.0.0
git push origin v1.0.0
```

That triggers `.github/workflows/release.yml` which builds multi-arch (`linux/amd64,linux/arm64`), pushes numbered tags `1.0.0 / 1.0 / 1 / 1.0.0-g<sha>` to `ghcr.io/paulmarshall-wfw/photo-viewer`, and attaches `photo-viewer-deploy.zip` to the release.

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | npm workspaces (`packages/shared`, `server`, `client`) |
| Server | Fastify v5 + Node 20 |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| Client | React 19 + Vite 6 + TypeScript + TanStack Query v5 |
| Auth | HTTP-only cookies, invite-only, case-insensitive email login |
| Metadata | DB-only (DB is source of truth) |
| EXIF reading | exiftool-vendored (read only — no writeback in v1) |
| Images | sharp + ImageMagick (PSD/PSB); macOS sips/qlmanage path retained for host-node dev only |
| Container | Node 20 Alpine, ImageMagick + libvips, non-root `node` user, tini PID 1 |
| Distribution | GHCR, multi-arch (amd64 + arm64), GitHub Actions release workflow, `latest` forbidden |
| Icons | lucide-react |
| Routing | react-router-dom v7 |
| Virtual scrolling | @tanstack/react-virtual |

## 8. Project Structure (after this session)

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
    photos/            FolderCard, PhotoCard (with reaction/comment badges),
                       ThumbnailGrid, ThumbnailStrip, ReactionBar,
                       CommentThread, PeopleTagInput
    viewer/            ImageDisplay, InfoPanel (filename → metadata →
                       reactions → comments layout), InlineEdit,
                       FullscreenWrapper, SlideshowControls
    shared/            ErrorBoundary, FolderPicker, ProgressBar,
                       ThemeToggle, NotificationBell, OnThisDayBanner, Toast
  styles/              variables.css (tokens), global.css

# Containerisation (added this session)
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

1. **Email login case-insensitive** — `loginByEmail` now `.trim().toLowerCase()`s the input before matching. Was rejecting `Jabulanison@gmail.com` against a stored `jabulanison@gmail.com`.
2. **fastify-static SPA fallback** — removed `wildcard: false` so `/assets/*.js` is actually served instead of being swallowed by the SPA `index.html` fallback.
3. **InfoPanel redesign** — Stories removed; layout reordered to `filename → file metadata → reactions → spacer → metadata fields → comments`. Date+Time sit side-by-side.
4. **BrowsePage header** — page title centred, breadcrumbs left, theme toggle moved next to settings on the right.
5. **ViewerPage header** — "Viewer" centred at top, photo title + folder pill below the divider, NotificationBell + theme toggle + settings + username + Logout in the same positions as BrowsePage.
6. **Docker packaging** (this session) — full `Dockerfile`, dev + recipient compose, install/upgrade scripts, GitHub Actions release workflow, README-INSTALL with NAS-specific walkthroughs.
7. **DATA_DIR fix during smoke test** — moved from `/app/data` to `/app/server/data` so the relative SPA path resolves correctly.

## 11. Validation Status

| Check | Status |
|-------|--------|
| `npm run build` | ✅ Passes |
| `docker build .` | ✅ Passes (Apple Silicon, single-arch) |
| Container starts and `/api/health` responds | ✅ |
| SPA `index.html` (700 bytes) served at `/` | ✅ |
| `/api/setup/status` returns `{needsSetup: true}` on fresh DB | ✅ |
| `create-admin.mjs --email --name --library` end-to-end | ✅ |
| Migrations run on first start | ✅ |
| Multi-arch build (amd64 + arm64) | ❌ Not yet — requires the release workflow on GHA |
| Recipient install on a clean Mac | ❌ Not yet — verification step 1 of the plan |
| NAS install (Synology / QNAP) | ❌ Not yet |

## 12. Files Most Likely to Matter Next

### If publishing v1.0.0
| File | Why |
|------|-----|
| `.github/workflows/release.yml` | The release pipeline. Multi-arch GHCR push + asset upload. |
| `deploy/.env.example` | The release workflow `sed`s `IMAGE_TAG` here to pin the deploy bundle to the published version. |
| `deploy/docker-compose.yml` | What recipients run. Pulls the published image. |
| `Dockerfile` | If a build fails on amd64, this is where to look. |

### If onboarding a real family
| File | Why |
|------|-----|
| `deploy/README-INSTALL.md` | The doc the recipient reads. NAS-specific walkthroughs live here. |
| `deploy/scripts/install.sh` / `install.ps1` | Single-command bootstrap for the recipient. |
| `scripts/create-admin.mjs` | First admin user bootstrap inside the container. |

### If extending features
| File | Why |
|------|-----|
| `server/src/db/schema.ts` | All Drizzle tables. |
| `server/src/db/migrations/*.sql` | Manual SQL migrations applied at startup by `migrate.ts`. |
| `server/src/notifications/service.ts` | Notification fan-out pattern (don't notify the actor). |
| `client/src/components/viewer/InfoPanel.tsx` | The largest UI surface for per-photo affordances. |

## 13. Constraints and Non-Negotiables

- **Docker is the supported distribution channel.** Don't add a non-Docker installer story to v1.
- **Never use `:latest`.** Per the `docker-build-and-publish` skill (v6.1). Numbered tags only: `1.0.0`, `1.0`, `1`, `1.0.0-g<sha>`.
- **Stay in Build Mode by default.** Don't bump `VERSION`, don't touch `CHANGELOG.md`, don't create git tags unless the user explicitly asks for a release.
- **Library mount is read-only.** No code path may write into `/library`.
- **Migration at startup** — new tables created via the SQL files in `server/src/db/migrations/`. Test on a copy first.
- **Contentless FTS5** — `photos_fts` requires the special `'delete'` command. Social features must not touch this table.
- **No notification fan-out to actor** — always exclude `actorId` from inserts.
- **SQLite NULLS LAST** — use the `CASE WHEN date_taken IS NULL THEN 1 ELSE 0 END` workaround.
- **Google Fonts CDN** — Space Grotesk + Plus Jakarta Sans loaded from `client/index.html`. Air-gapped installs will see fallback fonts.
- **No secrets in code** — `SESSION_SECRET` env var; install script generates one.

## 14. Known Open Issues

1. **Image size 707 MB.** Acceptable for v1 but trim-able: vips ships in both builder and runtime, sharp prebuilds are large, exiftool ships its own perl runtime. Worth a follow-up if pulls become painful.
2. **`@vitejs` dir lingers in `/app/node_modules`** after `npm prune --omit=dev`. Cosmetic — does not affect runtime. The skill's "image hygiene" verification step still flags it.
3. **No tests.** All validation is manual.
4. **HTTPS not built in.** README points at `mkcert`; no Caddy sidecar shipped yet.
5. **NAS UI walkthroughs in README are unverified** — written from documentation, not tested on real Synology/QNAP devices.
6. **Story auto-save on unmount** — pre-existing edge case from earlier sessions; left alone.

## 15. Risks and Cautions

- **First multi-arch build may surface arm64-specific native module issues.** Watch the GHA build logs for `better-sqlite3` and `sharp` failures. The builder stage installs `python3 make g++ vips-dev` so a fallback compile works.
- **Migration corruption on existing DBs.** New migrations are additive (`CREATE TABLE IF NOT EXISTS`), but always test against a copy.
- **Recipient confusion on NAS.** Synology/QNAP UIs differ across DSM versions. Be ready to update the README after first real NAS install.
- **Release Mode requires explicit user intent.** Per the skill, don't auto-release on a request like "publish this" without confirming the version bump and changelog implications.

## 16. Next Actions

### Now
1. Push the v1.0.0 tag (`git tag v1.0.0 && git push origin v1.0.0`) once you're ready to release.
2. Verify the GHA release succeeds and both arches are pushed to GHCR.
3. Run `bash scripts/install.sh` from the published `photo-viewer-deploy.zip` on this Mac end-to-end.

### Soon
4. Onboard the first real family (Marshall household) using the published bundle.
5. Verify NAS installs on at least one Synology and/or QNAP.
6. Add a Caddy reverse-proxy compose snippet for HTTPS as v1.1.

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
I'm continuing work on Photo Viewer v1.0.0, a self-hosted family photo annotation web app
distributed as a Docker image.

Read HANDOFF.md first — it has the full current state, container layout, release flow,
and constraints.

Key context:
- Monorepo: packages/shared + server (Fastify/SQLite/Drizzle) + client (React 19/Vite/TanStack Query)
- Distributed as a Docker image: ghcr.io/paulmarshall-wfw/photo-viewer
- Recipients run `docker compose up -d` against a deploy bundle (deploy/ in repo)
- Photo library is bind-mounted read-only at /library
- Metadata DB lives at /app/server/data/photo-viewer.db (host-mounted to ./data)
- Numbered version tags only — never `latest` (per docker-build-and-publish skill v6.1)
- Default to Build Mode; don't enter Release Mode without explicit intent

Locked constraints:
- DB is source of truth for all metadata in v1; XMP writeback was dropped
- photos_fts is contentless FTS5 — special 'delete' command, never regular DELETE
- Notifications never fan out to the actor
- One level of comment threading only
- SQLite NULLS LAST — use CASE WHEN workaround
- Library mount is read-only

The app is feature-complete and the Docker layer is built and smoke-tested locally.
v1.0.0 has not yet been published to GHCR.

Tell me what you want to do — publish v1.0.0, onboard a family, fix a bug, or extend features.
```
