# Photo Viewer — Project Handoff

## 1. Metadata

| Field | Value |
|-------|-------|
| Project | Photo Viewer |
| Updated | 2026-04-09T14:00:00Z |
| Handoff type | Unspecified (general continuation) |
| Status | Fully functional, production-ready on macOS |

## 2. Executive Summary

Self-hosted multi-user photo viewer web app for browsing, viewing, and annotating photos stored on a local filesystem. Photos are organized in folders. Metadata (titles, captions, dates, stories) is stored in XMP sidecar files (`.xmp`) and story files (`.story.md`) alongside originals. Supports JPEG, PNG, TIFF, RAW (Nikon NEF, Canon CR2/CR3, Sony ARW, Fuji RAF, Olympus ORF, Panasonic RW2, Adobe DNG), and Photoshop PSD/PSB files.

## 3. Current Objective

No specific feature in progress. The app is stable and usable. Recent work focused on: fixing a critical title/caption save bug (contentless FTS5 table), adding virtual scrolling, error toast notifications, slideshow enhancements (2s interval, loop/stop toggle), UI improvements (theme toggle on auth pages, back→gallery rename, fullscreen button repositioning), and thumbnail cache busting.

## 4. Current State

The app builds and runs cleanly. All features listed below are operational. The production build is current (`npm run build` succeeds). **Git version control is now active** with 4 commits on the `main` branch.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | npm workspaces (`packages/shared`, `server`, `client`) |
| Server | Fastify v5, fastify-plugin for global hooks |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| Client | React 19 + Vite 6 + TypeScript + TanStack Query v5 |
| Auth | Token-based via HTTP-only cookies, invite-only user system |
| Metadata | XMP sidecar files, exiftool-vendored for EXIF reading |
| Stories | `.story.md` Markdown sidecar files alongside photo originals |
| Images | sharp for JPEG/PNG/TIFF/RAW thumbnails/previews; macOS `sips` + `qlmanage` + exiftool for PSD/PSB |
| Icons | lucide-react |
| Hotkeys | react-hotkeys-hook |
| Routing | react-router-dom v7 |
| Virtual scrolling | @tanstack/react-virtual |

### Environment

- Node.js: `/Users/paulmarshall/.nvm/versions/node/v24.14.0/bin`
- Project root: `/Users/paulmarshall/Software by Claude/Photo Viewer/`
- Photos path: `/Users/paulmarshall/Pictures/01 New/New Images`
- Database: `server/data/photo-viewer.db`
- Cache (thumbnails/previews): `server/data/cache/`
- Admin email: `jabulanison@gmail.com`

## 5. Locked Business Rules

- **XMP is source of truth**: All user-edited metadata (title, caption, date) is written to XMP sidecar files. The database is a read-cache/index only.
- **Stories in `.story.md` files**: Story entries are stored in Markdown sidecar files (`<photo>.story.md`) with frontmatter and `## Author — Date` headings. Not stored in the database (only `hasStory` flag).
- **Photo cards show filename**: The photo grid always shows `photo.filename`, never the title. Title is shown in the Viewer page.
- **No-Line Rule**: No visible borders anywhere. Depth via tonal layering and ambient shadows.
- **Pill-shaped primary buttons**: `border-radius: 9999px` with gradient backgrounds.
- **Page names are fixed**: Library, Gallery, Viewer, Search, Activity, Settings, Login, Setup.

## 6. Current Architecture and Run Commands

```bash
# Install deps (from project root)
npm install

# Build all (shared must build first)
npm run build

# Start production server (serves both API and client on port 3000)
npm start

# Dev mode (concurrent server + vite dev server)
npm run dev
```

### Project Structure

```
packages/shared/src/
  types.ts          — User, Photo, Folder, StoryEntry, ActivityEntry, ImageFormat, SortField
  constants.ts      — SUPPORTED_EXTENSIONS, image dimensions, session config, slideshow intervals
  api-types.ts      — API request/response types
  index.ts          — barrel export

server/src/
  index.ts          — entry point
  app.ts            — Fastify app setup, plugin registration, static file serving
  config.ts         — port, dataDir, dbPath, cacheDir paths
  auth/             — cookie-based auth middleware and routes
  admin/            — user management, config, browse-directories
  photos/           — indexer, folder contents, photo queries, stats
  images/           — thumbnail/preview generation (sharp, sips, qlmanage, exiftool)
  metadata/         — XMP read/write, EXIF extraction, story file read/write
  activity/         — activity logging and feed
  search/           — full-text + filter search (contentless FTS5)
  db/               — Drizzle schema, SQLite connection, migrations

client/src/
  App.tsx           — Router, auth flow, page orchestration, ToastProvider
  api/client.ts     — fetch-based API client
  hooks/            — useAuth, useFolders, usePhotos, useTheme
  pages/            — BrowsePage, ViewerPage, SearchPage, ActivityPage, AdminPage, SetupPage, LoginPage
  components/
    layout/         — Breadcrumbs
    photos/         — FolderCard, PhotoCard, ThumbnailGrid (virtualized), ThumbnailStrip
    viewer/         — ImageDisplay, InfoPanel, InlineEdit, StoryEditor, FullscreenWrapper, SlideshowControls
    search/         — SearchBar, FilterPanel
    shared/         — ErrorBoundary, FolderPicker, ProgressBar, ThemeToggle, Toast
  styles/           — variables.css (design tokens), global.css (base styles)
```

### Database Schema

5 tables via Drizzle ORM on SQLite:

- **configTable** — key/value system config (e.g. photos path)
- **users** — id, email, displayName, role (admin/user), sessionToken, inviteToken, inviteAcceptedAt, revokedAt, createdAt
- **folders** — id, path, name, parentPath, photoCount, firstPhotoId, indexedAt
- **photos** — id, folderPath, filename, filePath, fileSize, fileModifiedAt, format, width, height, title, caption, dateTaken, hasStory, hasThumbnail, hasPreview, thumbnailPath, previewPath, indexedAt
- **activity** — id, userId, photoId, action, detail, createdAt
- **photos_fts** — contentless FTS5 virtual table indexing title, caption, story_text, folder_name, filename (requires special `'delete'` command for updates, not regular DELETE)

Indices on: photos (folderPath, dateTaken, format), activity (createdAt, userId)

### Page Names

| Page | Component | Description |
|------|-----------|-------------|
| **Library** | BrowsePage (root) | All folders with photo counts |
| **Gallery** | BrowsePage (in folder) | Photo grid for a specific folder (virtualized) |
| **Viewer** | ViewerPage | Single photo with slideshow, thumbnail strip, info panel |
| **Search** | SearchPage | Full-text search with date/annotation filters |
| **Activity** | ActivityPage | Activity feed + annotation progress |
| **Settings** | AdminPage | User management, storage config |
| **Login** | EmailLoginPage / LoginPage | Email sign-in / invite acceptance |
| **Setup** | SetupPage | First-time admin setup |

## 7. Preview / Format Support Status

| Format | Thumbnail | Preview | Status |
|--------|-----------|---------|--------|
| JPEG | ✅ sharp | ✅ sharp | Full support |
| PNG | ✅ sharp | ✅ sharp | Full support |
| TIFF | ✅ sharp | ✅ sharp | Full support |
| RAW (NEF, CR2, CR3, ARW, RAF, ORF, RW2, DNG) | ✅ sharp | ✅ sharp | Full support |
| PSD | ✅ sips/qlmanage/exiftool | ✅ sips/qlmanage/exiftool | macOS only, 3-tier fallback |
| PSB | ⚠️ exiftool (~160px) | ⚠️ exiftool (~160px) | Low-res for 16-bit files |

## 8. Recent Fixes Already Landed

1. **Title/caption save bug fixed**: The `updateFtsField` function was using `DELETE FROM photos_fts` on a contentless FTS5 table, which SQLite rejects. Fixed to use the FTS5 special `INSERT INTO photos_fts(photos_fts, ...) VALUES ('delete', ...)` command. Also reordered calls so FTS update reads old values before the DB update writes new ones.
2. **Story delete bug fixed**: `fetchJson` was sending `Content-Type: application/json` on DELETE requests with no body, potentially causing Fastify to reject. Fixed to only set the header when a body is present.
3. **Virtual scrolling integrated**: ThumbnailGrid now uses `@tanstack/react-virtual` to only render visible rows. Uses ResizeObserver for responsive column count. BrowsePage passes a `scrollContainerRef`.
4. **Error toast notifications added**: Toast component (`client/src/components/shared/Toast.tsx`) with `ToastProvider` context and `useToast()` hook. All 6 mutations in InfoPanel have `onError` callbacks showing descriptive error messages.
5. **Theme toggle on Login/Setup pages**: ThemeToggle positioned absolutely top-right on EmailLoginPage (in App.tsx), LoginPage (invite acceptance), and SetupPage.
6. **Thumbnail cache busting**: Client appends `?v={fileModifiedAt}` (or `indexedAt` for folders) to all thumbnail/preview URLs. Server adds ETag headers derived from cached file mtime+size.
7. **2-second slideshow interval**: Added `2` to `SLIDESHOW_INTERVALS` constant in shared/constants.ts. Dropdown now shows: 2s, 5s, 10s, 15s, 30s.
8. **Slideshow loop/stop toggle**: New `loop` prop on SlideshowControls. Repeat icon = continuous loop, ArrowRightToLine icon = stop at last photo. When not looping, slideshow auto-pauses at the last photo.
9. **Viewer back button renamed**: Changed from "← Back" to "← Gallery".
10. **Fullscreen button repositioned**: Moved from absolute-positioned overlay at bottom of FullscreenWrapper to a dedicated `FullscreenButton` component rendered between the image and thumbnail strip. Uses React context shared with FullscreenWrapper.
11. **Story save bug fixed** (earlier session): Added `key={localPhoto.id}` to InfoPanel, auto-save on unmount, ⌘Enter keyboard shortcut.
12. **Viewer toolbar reorganised** (earlier session): Slideshow, Download, Info buttons in centred toolbar row.
13. **Image responsive sizing** (earlier session): `max-width: 100%` / `max-height: 100%` within flex container.

## 9. Known Open Issues to Recheck

1. **PSB thumbnail quality**: When sips and qlmanage both fail for 16-bit PSB files, the fallback uses the embedded PhotoshopThumbnail which is only ~160px. Installing ImageMagick would enable full-quality PSB conversion.
2. **Story auto-save edge case**: If the API call from auto-save fails during unmount, the toast may not display (component already unmounted). The mutation fires but error recovery is limited.
3. **Search uses contentless FTS5**: The `photos_fts` table is rebuilt on each index run (`DROP TABLE` + `CREATE`). Updates between indexing runs use the special `'delete'` command — any code modifying searchable fields must use this pattern (see `updateFtsField` in `server/src/metadata/routes.ts`).

## 10. Validation Status

| Check | Status |
|-------|--------|
| `npm run build` | ✅ Passes (shared → client → server) |
| Production server starts | ✅ Serves on port 3000 |
| Login flow | ✅ Email-based login works |
| Folder browsing | ✅ 47 folders indexed, navigation works |
| Photo viewer | ✅ Image display, navigation, info panel all functional |
| Title/caption save | ✅ Persists to XMP and database, survives navigation |
| Story add/save | ✅ Stories persist to `.story.md` files, auto-save on navigate works |
| Story delete | ✅ Fixed Content-Type header issue on bodyless DELETE |
| Slideshow | ✅ 2s/5s/10s/15s/30s intervals, loop/stop toggle |
| Theme toggle | ✅ Available on all pages including Login/Setup, persists to localStorage |
| Virtual scrolling | ✅ ThumbnailGrid virtualized for large folders |
| Error toasts | ✅ Show on mutation failures |
| Git repo | ✅ Initialized, 4 commits on main |
| Unit tests | ❌ None exist |

## 11. Files Most Likely to Matter Next

| File | Why |
|------|-----|
| `client/src/pages/ViewerPage.tsx` | Main viewer layout — slideshow, toolbar, fullscreen |
| `client/src/components/viewer/InfoPanel.tsx` | Metadata editing + story management — all mutations here |
| `client/src/components/viewer/StoryEditor.tsx` | Story input — auto-save, ⌘Enter, edit/delete |
| `client/src/components/viewer/FullscreenWrapper.tsx` | Fullscreen context + button — recently refactored |
| `client/src/components/viewer/SlideshowControls.tsx` | Slideshow interval + loop/stop toggle |
| `client/src/components/photos/ThumbnailGrid.tsx` | Virtualized photo grid |
| `client/src/components/shared/Toast.tsx` | Error notification system |
| `client/src/components/shared/ThemeToggle.tsx` | Theme toggle — used on every page |
| `client/src/App.tsx` | App root — ToastProvider, EmailLoginPage theme toggle |
| `server/src/metadata/routes.ts` | All metadata API endpoints — FTS5 update logic here |
| `server/src/images/routes.ts` | Thumbnail/preview serving with ETag headers |
| `packages/shared/src/constants.ts` | Slideshow intervals, image dimensions, extensions |

## 12. Constraints and Non-Negotiables

- **macOS required** for PSD/PSB support (uses `sips` and `qlmanage`)
- **Node.js v24** at `/Users/paulmarshall/.nvm/versions/node/v24.14.0/bin`
- **Google Fonts dependency** — Space Grotesk and Plus Jakarta Sans loaded from CDN in `client/index.html`
- **No secrets in code** — session secret is hardcoded as a default but should use `SESSION_SECRET` env var in production
- **Contentless FTS5 constraint** — `photos_fts` table cannot use regular DELETE; must use the special `'delete'` command pattern (see `updateFtsField`)

## 13. Assumptions and Open Questions

- **Assumption**: The app runs on a single macOS machine for personal/family use
- **Assumption**: Photos are added to the filesystem externally; the app only reads/indexes
- **Decision**: No bulk delete for stories — individual story deletion is the only supported flow.

## 14. Risks and Cautions

- **No tests**: All validation is manual. Regressions are discovered by the user.
- **Story auto-save edge case**: If the API call from auto-save fails (e.g. network issue during unmount), the story text is lost silently. The mutation fires but has no error recovery during unmount.
- **FTS5 update fragility**: Any new code that modifies title, caption, or other indexed fields must use the `updateFtsField` pattern with the contentless FTS5 `'delete'` command. Using regular SQL DELETE on `photos_fts` will throw an error.

## 15. Next Actions

No specific next actions requested. Potential improvements:
1. Add error toast notifications for failed mutations outside InfoPanel (e.g. login, indexing)
2. Add unit/integration tests
3. Add ETag/versioning to thumbnail URLs to prevent stale cache issues (client-side done, could add server-side revalidation)

## 16. Ready-Made Prompt for Starting a New Thread

```
I'm continuing work on Photo Viewer, a self-hosted multi-user photo annotation app.

Read the handoff document at HANDOFF.md first — it has the full current state, architecture, recent fixes, and known issues.

Key context:
- Monorepo: packages/shared + server (Fastify/SQLite/Drizzle) + client (React 19/Vite/TanStack Query)
- Build: `npm run build` then `npm start` (port 3000)
- Photos path: /Users/paulmarshall/Pictures/01 New/New Images
- Admin email: jabulanison@gmail.com
- Stories are saved to .story.md sidecar files, metadata to .xmp sidecar files
- Git repo active, 4 commits on main
- Recent work: fixed title/caption save (FTS5 bug), fixed story delete, added virtual scrolling, error toasts, slideshow enhancements (2s interval, loop/stop), theme toggle on auth pages, fullscreen button repositioned, back→gallery rename
- IMPORTANT: photos_fts is a contentless FTS5 table — use the special 'delete' command, not regular DELETE
- No tests

[Describe what you want to do next]
```
