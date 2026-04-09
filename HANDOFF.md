# Photo Viewer — Project Handoff

## 1. Metadata

| Field | Value |
|-------|-------|
| Project | Photo Viewer |
| Updated | 2026-04-09T12:00:00Z |
| Handoff type | Unspecified (general continuation) |
| Status | Fully functional, production-ready on macOS |

## 2. Executive Summary

Self-hosted multi-user photo viewer web app for browsing, viewing, and annotating photos stored on a local filesystem. Photos are organized in folders. Metadata (titles, captions, dates, stories) is stored in XMP sidecar files (`.xmp`) and story files (`.story.md`) alongside originals. Supports JPEG, PNG, TIFF, RAW (Nikon NEF, Canon CR2/CR3, Sony ARW, Fuji RAF, Olympus ORF, Panasonic RW2, Adobe DNG), and Photoshop PSD/PSB files.

## 3. Current Objective

No specific feature in progress. The app is stable and usable. Recent work focused on UI polish: fixing story save/display bugs, reorganising the Viewer toolbar layout, making the theme toggle accessible from every page, and improving the Settings page back button.

## 4. Current State

The app builds and runs cleanly. All features listed in "What's Built and Working" are operational. The production build is current (`npm run build` succeeds, `client/dist/` is up to date).

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
  search/           — full-text + filter search
  db/               — Drizzle schema, SQLite connection, migrations

client/src/
  App.tsx           — Router, auth flow, page orchestration
  api/client.ts     — fetch-based API client
  hooks/            — useAuth, useFolders, usePhotos, useTheme
  pages/            — BrowsePage, ViewerPage, SearchPage, ActivityPage, AdminPage, SetupPage, LoginPage
  components/
    layout/         — Breadcrumbs
    photos/         — FolderCard, PhotoCard, ThumbnailGrid, ThumbnailStrip
    viewer/         — ImageDisplay, InfoPanel, InlineEdit, StoryEditor, FullscreenWrapper, SlideshowControls
    search/         — SearchBar, FilterPanel
    shared/         — ErrorBoundary, FolderPicker, ProgressBar, ThemeToggle
  styles/           — variables.css (design tokens), global.css (base styles)
```

### Database Schema

5 tables via Drizzle ORM on SQLite:

- **configTable** — key/value system config (e.g. photos path)
- **users** — id, email, displayName, role (admin/user), sessionToken, inviteToken, inviteAcceptedAt, revokedAt, createdAt
- **folders** — id, path, name, parentPath, photoCount, firstPhotoId, indexedAt
- **photos** — id, folderPath, filename, filePath, fileSize, fileModifiedAt, format, width, height, title, caption, dateTaken, hasStory, hasThumbnail, hasPreview, thumbnailPath, previewPath, indexedAt
- **activity** — id, userId, photoId, action, detail, createdAt

Indices on: photos (folderPath, dateTaken, format), activity (createdAt, userId)

### Page Names

| Page | Component | Description |
|------|-----------|-------------|
| **Library** | BrowsePage (root) | All folders with photo counts |
| **Gallery** | BrowsePage (in folder) | Photo grid for a specific folder |
| **Viewer** | ViewerPage | Single photo with slideshow, thumbnail strip, info panel |
| **Search** | SearchPage | Search results with filters |
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

1. **Story save bug fixed**: Added `key={localPhoto.id}` to `<InfoPanel>` in ViewerPage so it remounts on photo change. Previously, stale story data from the previous photo would bleed into the next photo's info panel.
2. **Story auto-save on navigate**: StoryEditor now auto-saves unsaved text when the component unmounts (e.g. navigating to another photo). Previously, typing a story and navigating away without clicking "Add Story" would lose the text.
3. **Story submit UX**: Added ⌘Enter/Ctrl+Enter keyboard shortcut to submit stories. Textarea blurs after submission. A hint ("Press ⌘Enter to submit") appears when text is entered.
4. **Viewer toolbar reorganised**: Slideshow, Download, and Info buttons moved from the top-right of the header bar to a centred toolbar row between the header and the image. Order: slideshow → download → info.
5. **Fullscreen button relocated**: Moved from bottom-right corner to bottom-centre of the viewer.
6. **Image responsive sizing**: Image in viewer now uses `max-width: 100%` / `max-height: 100%` within its flex container, so it resizes dynamically with the browser window.
7. **Theme toggle on every page**: Dark/light mode toggle (moon/sun icon) now appears inline in every page header, immediately after the page name (e.g. "Library 🌙", "Viewer 🌙", "Settings 🌙"). Removed the old text-based "Dark"/"Light" button from the Library header.
8. **Settings back button styled**: "← Back to Library" button on the Settings page now uses `btn-primary` (same accent colour as the Invite button) for better visibility.

## 9. Known Open Issues to Recheck

1. **PSB thumbnail quality**: When sips and qlmanage both fail for 16-bit PSB files, the fallback uses the embedded PhotoshopThumbnail which is only ~160px. Installing ImageMagick would enable full-quality PSB conversion.
2. **Browser caching of corrupt thumbnails**: If a corrupt thumbnail was previously served with `Cache-Control: public, max-age=86400`, browsers may cache it for up to 24 hours. Consider adding an ETag or version query parameter to thumbnail URLs.
3. **No pagination**: Photo grid loads all photos in a folder at once. TanStack Virtual is installed but not wired up for virtualized scrolling on very large folders (900+ photos).

## 10. Validation Status

| Check | Status |
|-------|--------|
| `npm run build` | ✅ Passes (shared → client → server) |
| Production server starts | ✅ Serves on port 3000 |
| Login flow | ✅ Email-based login works |
| Folder browsing | ✅ 47 folders indexed, navigation works |
| Photo viewer | ✅ Image display, navigation, info panel all functional |
| Story add/save | ✅ Stories persist to `.story.md` files, auto-save on navigate works |
| Theme toggle | ✅ Available on all pages, persists to localStorage |
| Unit tests | ❌ None exist |

## 11. Files Most Likely to Matter Next

| File | Why |
|------|-----|
| `client/src/pages/ViewerPage.tsx` | Main viewer layout — recently reorganised toolbar |
| `client/src/components/viewer/StoryEditor.tsx` | Story input — recently added auto-save and ⌘Enter |
| `client/src/components/viewer/InfoPanel.tsx` | Metadata editing panel — keyed by photo.id now |
| `client/src/components/viewer/ImageDisplay.tsx` | Image sizing — recently changed to responsive flex |
| `client/src/components/viewer/FullscreenWrapper.tsx` | Fullscreen button — recently centred |
| `client/src/components/shared/ThemeToggle.tsx` | Theme toggle component — used on every page |
| `client/src/App.tsx` | App root — theme toggle removed from here, now per-page |
| `client/src/pages/AdminPage.tsx` | Settings — back button restyled |
| `server/src/metadata/story.ts` | Story file read/write logic |
| `server/src/metadata/routes.ts` | All metadata API endpoints including story CRUD |

## 12. Constraints and Non-Negotiables

- **macOS required** for PSD/PSB support (uses `sips` and `qlmanage`)
- **No git repository** — project is not under version control
- **Node.js v24** at `/Users/paulmarshall/.nvm/versions/node/v24.14.0/bin`
- **Google Fonts dependency** — Space Grotesk and Plus Jakarta Sans loaded from CDN in `client/index.html`
- **No secrets in code** — session secret is hardcoded as a default but should use `SESSION_SECRET` env var in production

## 13. Assumptions and Open Questions

- **Assumption**: The app runs on a single macOS machine for personal/family use
- **Assumption**: Photos are added to the filesystem externally; the app only reads/indexes
- **Open question**: Should the theme toggle also appear on the Login and Setup pages? (Currently it does not — those pages have no header bar)
- **Open question**: Should there be a way to delete all stories for a photo at once?

## 14. Risks and Cautions

- **No version control**: There is no git repository. Any destructive file operation is permanent. Consider initialising git.
- **No tests**: All validation is manual. Regressions are discovered by the user.
- **Large folders**: Folders with 900+ photos load all thumbnails at once, which can be slow. TanStack Virtual is installed but not integrated.
- **Story auto-save edge case**: If the API call from auto-save fails (e.g. network issue during unmount), the story text is lost silently. The mutation fires but has no error recovery.

## 15. Next Actions

No specific next actions requested. Potential improvements:
1. Initialise a git repository for version control
2. Integrate TanStack Virtual for large folder performance
3. Add the theme toggle to Login/Setup pages
4. Add error toast notifications for failed mutations (especially story auto-save)
5. Add ETag/versioning to thumbnail URLs to prevent stale cache issues

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
- Recent work: fixed story save bugs, reorganised viewer toolbar, added theme toggle to all page headers, responsive image sizing
- No git repo, no tests

[Describe what you want to do next]
```
