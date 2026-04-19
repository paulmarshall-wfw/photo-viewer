# Photo Viewer — Project Handoff

## 1. Metadata

| Field | Value |
|-------|-------|
| Project | Photo Viewer |
| Updated | 2026-04-19T00:00:00Z |
| Handoff type | Unspecified (general continuation) |
| Status | Fully functional, production-ready on macOS |

## 2. Executive Summary

Self-hosted multi-user photo viewer web app for browsing, viewing, and annotating photos stored on a local filesystem. Photos are organized in folders. Metadata (titles, captions, dates, stories) is stored in XMP sidecar files (`.xmp`) and story files (`.story.md`) alongside originals. Supports JPEG, PNG, TIFF, RAW (Nikon NEF, Canon CR2/CR3, Sony ARW, Fuji RAF, Olympus ORF, Panasonic RW2, Adobe DNG), and Photoshop PSD/PSB files.

## 3. Current Objective

No specific feature in progress. The app is stable and fully functional. Most recent work focused on: fixing image preview quality for DNG/NEF/PSB files, adding full PSB preview generation to the indexer pipeline, UI refinements (Settings layout, Viewer info button), and adding a Read Me documentation page accessible from all pages.

## 4. Current State

The app builds and runs cleanly. All features listed below are operational. The production build is current (`npm run build` succeeds). **Git version control is active** with 5 commits on the `main` branch.

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
| Images | sharp for JPEG/PNG/TIFF/RAW thumbnails/previews; macOS `sips` + `qlmanage` + ImageMagick for PSD/PSB |
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
- **Page names are fixed**: Library, Gallery, Viewer, Search, Activity, Settings, Login, Setup, Read Me.

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
  images/           — thumbnail/preview generation (sharp, sips, qlmanage, ImageMagick, exiftool)
  metadata/         — XMP read/write, EXIF extraction, story file read/write
  activity/         — activity logging and feed
  search/           — full-text + filter search (contentless FTS5)
  db/               — Drizzle schema, SQLite connection, migrations

client/src/
  App.tsx           — Router, auth flow, page orchestration, ToastProvider
  api/client.ts     — fetch-based API client
  hooks/            — useAuth, useFolders, usePhotos, useTheme
  pages/            — BrowsePage, ViewerPage, SearchPage, ActivityPage, AdminPage,
                      SetupPage, LoginPage, ReadmePage
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
| **Read Me** | ReadmePage | User documentation at `/readme` |
| **Login** | EmailLoginPage / LoginPage | Email sign-in / invite acceptance |
| **Setup** | SetupPage | First-time admin setup |

## 7. Preview / Format Support Status

| Format | Thumbnail | Preview | Notes |
|--------|-----------|---------|-------|
| JPEG | ✅ sharp | ✅ sharp | Full support |
| PNG | ✅ sharp | ✅ sharp | Full support |
| TIFF | ✅ sharp | ✅ sharp | Full support |
| NEF, CR2, CR3, ARW, RAF, ORF, RW2 | ✅ sharp (embedded JPEG) | ✅ sharp (embedded JPEG) | Full support |
| DNG | ✅ sharp (findBestSource / subIFD) | ✅ sharp (findBestSource / subIFD) | Bypasses embedded extraction — uses TIFF subIFD |
| PSD | ✅ sips → qlmanage → ImageMagick fallback | ✅ sips → qlmanage → ImageMagick fallback | macOS only, 3-tier |
| PSB | ✅ ImageMagick `[0]` (~2s) | ✅ ImageMagick `[0]` (~2s) | Auto-generated at index time; 16-bit files need ImageMagick |

### PSB/PSD preview generation pipeline

`convertPsdToBuffer` in `server/src/images/preview-generator.ts`:
1. **Method 1: sips** — fast, works for standard 8-bit PSDs
2. **Method 2: qlmanage** — macOS Quick Look, validates output with `isImageContentValid`
3. **Method 3: ImageMagick** — handles 16-bit PSBs that sips/qlmanage can't read; uses `psd:${path}[0]` to read only the merged composite layer (~8× faster than all layers, ~2s per file)

PSB previews are **automatically generated during the indexer's `'previews'` phase** — no manual step needed.

### Preview cache-busting

All preview/thumbnail URLs append `?v=${photo.indexedAt}` (not `fileModifiedAt`). This ensures browsers fetch fresh images after any index run that regenerates previews. `indexedAt` changes on every index run.

## 8. Recent Fixes (this session)

1. **DNG previews too small** — `extractEmbeddedPreview` returned a small embedded JPEG. Fixed by detecting `.dng` extension in `server/src/images/routes.ts` and calling `generatePreview` directly (uses sharp's `findBestSource` to select the best TIFF subIFD).
2. **NEF/image resize broken** — `ImageDisplay.tsx` had an inner wrapper `<div>` with `maxHeight: '100%'` causing a circular flex height dependency. Removed the wrapper; `<img>` is now a direct flex child of the `overflow: hidden` container. Image now correctly fits the viewport and responds to window resize.
3. **PSB previews tiny (~160px)** — sips and qlmanage both fail for 16-bit PSB. The exiftool `PhotoshopThumbnail` fallback is only ~160px. Added ImageMagick as Method 3 using `psd:file[0]` (merged composite only — ~2s vs ~25s for all layers).
4. **PSB previews not regenerated on index** — Added a `'previews'` phase to the indexer that finds all `format='psd'` photos missing cached previews/thumbnails and generates them. Progress is shown in the UI with a progress bar (same UI as the `'indexing'` phase).
5. **Stale PSB previews after regeneration** — Browser cached the old tiny preview URL. Fixed by switching from `?v=fileModifiedAt` to `?v=indexedAt` in `ImageDisplay.tsx`.
6. **Viewer "i" button** — Previously only showed blue accent when info panel was open. Now always shows blue background regardless of panel state.
7. **Settings Storage Location layout** — `FolderPicker` path input now has `flex: 1, minWidth: 0` to fill available width. Update button moved to its own row so the path is fully readable.
8. **Read Me documentation page** — New `ReadmePage` component at `/readme` route. Covers Library, Gallery, Viewer, Metadata & Stories, Search, Activity, Settings, Keyboard Shortcuts, and Supported File Formats. Accessible via a "Read Me" button integrated into the nav bar of every page (Browse, Viewer, Search, Activity).

## 9. Known Open Issues

1. **Story auto-save edge case**: If the API call from auto-save fails during unmount, the toast may not display (component already unmounted). The mutation fires but error recovery is limited.
2. **Search uses contentless FTS5**: The `photos_fts` table is rebuilt on each index run. Any code modifying searchable fields (title, caption, story_text) must use the `updateFtsField` pattern with the special `'delete'` command — not a regular SQL DELETE.
3. **No tests**: All validation is manual. Regressions are discovered by the user.

## 10. Validation Status

| Check | Status |
|-------|--------|
| `npm run build` | ✅ Passes (shared → client → server) |
| Production server starts | ✅ Serves on port 3000 |
| Login flow | ✅ Email-based login works |
| Folder browsing | ✅ Navigation works |
| Photo viewer | ✅ Image display, navigation, info panel all functional |
| Image resize on window change | ✅ Fixed (flex layout) |
| DNG previews | ✅ Full-resolution via findBestSource |
| PSB previews | ✅ Full-size via ImageMagick; auto-generated at index time |
| Title/caption save | ✅ Persists to XMP and database |
| Story add/save/delete | ✅ All operations work |
| Slideshow | ✅ 2s/5s/10s/15s/30s intervals, loop/stop toggle |
| Theme toggle | ✅ Available on all pages, persists to localStorage |
| Virtual scrolling | ✅ ThumbnailGrid virtualized for large folders |
| Error toasts | ✅ Show on mutation failures |
| Read Me page | ✅ Accessible from all pages via nav bar button |
| Git repo | ✅ 5 commits on main |
| Unit tests | ❌ None exist |

## 11. Files Most Likely to Matter Next

| File | Why |
|------|-----|
| `client/src/pages/ViewerPage.tsx` | Main viewer layout — slideshow, toolbar, fullscreen |
| `client/src/components/viewer/ImageDisplay.tsx` | Image rendering, preview URL, cache-busting |
| `client/src/components/viewer/InfoPanel.tsx` | Metadata editing + story management — all mutations here |
| `client/src/components/viewer/StoryEditor.tsx` | Story input — auto-save, ⌘Enter, edit/delete |
| `client/src/pages/ReadmePage.tsx` | User documentation — update when features change |
| `client/src/pages/BrowsePage.tsx` | Library/Gallery — index progress UI |
| `server/src/images/preview-generator.ts` | PSD/PSB conversion pipeline (sips → qlmanage → ImageMagick) |
| `server/src/images/routes.ts` | Thumbnail/preview serving; DNG special-case handling |
| `server/src/photos/indexer.ts` | Indexer phases: scanning → indexing → previews → complete |
| `server/src/metadata/routes.ts` | All metadata API endpoints — FTS5 update logic here |
| `packages/shared/src/constants.ts` | Slideshow intervals, image dimensions, extensions |

## 12. Constraints and Non-Negotiables

- **macOS required** for PSD/PSB support (uses `sips`, `qlmanage`, and optionally `magick`)
- **ImageMagick must be installed** for PSB support (`brew install imagemagick`)
- **Node.js v24** at `/Users/paulmarshall/.nvm/versions/node/v24.14.0/bin`
- **Google Fonts dependency** — Space Grotesk and Plus Jakarta Sans loaded from CDN in `client/index.html`
- **No secrets in code** — session secret is hardcoded as a default but should use `SESSION_SECRET` env var in production
- **Contentless FTS5 constraint** — `photos_fts` table cannot use regular DELETE; must use the special `'delete'` command pattern (see `updateFtsField` in `server/src/metadata/routes.ts`)

## 13. Assumptions and Open Questions

- **Assumption**: The app runs on a single macOS machine for personal/family use
- **Assumption**: Photos are added to the filesystem externally; the app only reads/indexes
- **Decision**: No bulk delete for stories — individual story deletion is the only supported flow
- **Decision**: No floating UI elements — all nav buttons (Read Me, theme toggle, etc.) are integrated into each page's existing header/nav bar

## 14. Risks and Cautions

- **No tests**: All validation is manual. Regressions are discovered by the user.
- **FTS5 update fragility**: Any new code that modifies title, caption, or other indexed fields must use the `updateFtsField` pattern with the contentless FTS5 `'delete'` command. Using regular SQL DELETE on `photos_fts` will throw an error.
- **Story auto-save edge case**: If the API call from auto-save fails (e.g. network issue during unmount), the story text is lost silently.
- **PSB indexing time**: Large PSB files take ~2s each via ImageMagick. Libraries with many PSB files will have a slow first index run.

## 15. Next Actions

No specific next actions requested. Potential improvements:
1. Add unit/integration tests for the server API (especially FTS5 logic)
2. Add map view for photos with GPS EXIF data
3. Add bulk annotation tools (e.g. apply a caption to a selection of photos)
4. Support video files (MP4, MOV)
5. Add per-folder annotation progress in the Library view

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
- Git repo active, 5 commits on main
- Recent work: fixed DNG/NEF/PSB image previews, PSB auto-generation during indexing, image resize on window change, Viewer "i" button always blue, Settings layout fix, added Read Me documentation page on all pages
- IMPORTANT: photos_fts is a contentless FTS5 table — use the special 'delete' command, not regular DELETE
- IMPORTANT: DNG files bypass embedded extraction — use generatePreview() directly (findBestSource)
- PSB previews use ImageMagick psd:file[0] — must have ImageMagick installed (brew install imagemagick)
- No tests

[Describe what you want to do next]
```
