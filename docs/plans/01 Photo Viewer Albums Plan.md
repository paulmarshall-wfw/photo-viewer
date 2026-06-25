# Photo Viewer Albums Plan

## Summary

Add virtual albums as database-backed collections of existing folder and photo records. Albums will not move, copy, rename, duplicate, or write physical image/folder files.

Albums have two visibility states: `private` and `shared`. Shared albums are visible to all signed-in users; there is no per-person sharing or nominee list in this version.

## Key Changes

- Add a top-level `Albums` navigation item in the authenticated app shell.
- Add an `AlbumsPage` for listing albums with create, open, visibility badge, owner, item counts, empty/loading/error states, and retry.
- Add an `AlbumDetailPage` that shows album name, visibility, member folders, explicit photos, resolved album photos, and remove controls.
- Add hover/focus `Add to album` controls on photo and folder cards outside album views.
- Use an anchored album picker popover for choosing albums:
  - Searchable checklist of albums visible/editable by the current user.
  - Checked state for albums that already contain that photo/folder.
  - Checking adds immediately; unchecking removes immediately.
  - Include `Create album` in the popover, defaulting new albums to `private`.
  - On touch/mobile, expose the same action as a visible compact button or item action menu because hover is unavailable.

## Data Model And API

- Add migration `0003_albums.sql` and matching Drizzle schema:
  - `albums`: `id`, `name`, `visibility` (`private` or `shared`), `owner_user_id`, `created_at`, `updated_at`.
  - `album_folders`: `album_id`, `folder_path`, `added_by_user_id`, `added_at`, primary key on `(album_id, folder_path)`.
  - `album_photos`: `album_id`, `photo_id`, `added_by_user_id`, `added_at`, primary key on `(album_id, photo_id)`.
- Folder album membership is live: adding a folder stores the folder path, and newly indexed photos in that folder appear in the album automatically.
- Resolved album photos dedupe by `photo.id` when a photo is included directly and through a folder.
- Add shared types for `Album`, `AlbumSummary`, `AlbumDetail`, `AlbumVisibility`, create/update requests, membership requests, and item album-membership responses.
- Add `/api/albums` routes:
  - `GET /api/albums`: albums visible to the current user.
  - `POST /api/albums`: create an album owned by the current user; default visibility `private`.
  - `GET /api/albums/:id`: album metadata, folders, explicit photos, and resolved display photos.
  - `PATCH /api/albums/:id`: update name and visibility.
  - `DELETE /api/albums/:id`: delete album records only.
  - `POST /api/albums/:id/folders`, `DELETE /api/albums/:id/folders`: add/remove folder references.
  - `POST /api/albums/:id/photos`, `DELETE /api/albums/:id/photos/:photoId`: add/remove explicit photos.
  - `GET /api/albums/membership?photoId=...` or `?folderPath=...`: return album checked states for the picker.
- Authorization:
  - Shared albums are readable by any authenticated user.
  - Private albums are readable by the owner and admins.
  - Album edits/deletes are allowed for the owner and admins only.
  - Non-owners can view shared albums but cannot change their contents.

## UI Behavior

- Album creation uses a focused dialog with visible `Name` and `Visibility` fields; visibility uses a two-option segmented/radio control labeled `Private` and `Shared`.
- Album list uses compact repeated album rows/cards with counts for folders, explicit photos, and resolved photos.
- Album detail separates “Folders in this album” from “Photos in this album” so users understand live folder membership versus individually added photos.
- Outside album views, photo/folder hover controls should be transient but keyboard accessible via focus.
- The album picker popover should show loading, empty, and mutation-error states without losing the user’s current item context.
- Existing theme tokens, button classes, thumbnail components, icons, and React Query patterns should be reused.
- Use meaningful routes: `/albums` for the list and `/albums/:albumId` for detail.

## Test Plan

- Run `npm run build` from the repo root.
- Verify migration on a fresh SQLite database and on an existing database with migrations `0001` and `0002` already applied.
- API checks:
  - Create private album, list/read it as owner, confirm another normal user cannot read it.
  - Mark album shared, confirm another authenticated user can read it but cannot edit it.
  - Confirm unauthenticated users still receive `401`.
  - Add/remove folder and photo references without changing `folders`, `photos`, or filesystem files.
  - Confirm duplicate resolved photos are returned once.
  - Confirm item membership endpoint returns correct checked states.
- UI checks in Chrome:
  - Albums nav item appears at top level and shows active state.
  - Create album, change visibility, open detail, add/remove folders and photos.
  - Hover/focus a photo and folder outside an album, open picker, search albums, check/uncheck album membership.
  - Verify mobile/touch access to the same action without hover.
  - Verify empty/loading/error states and dark/light mode.
- Add one concise entry to `docs/build-logs/2026-06.md` after implementation.

## Assumptions

- `shared` means visible to all authenticated users, with no individual recipient selection.
- Folder membership is live, not a snapshot.
- Album editing is limited to creator and admins.
- v1 does not include manual album ordering, custom cover images, anonymous share links, comments on albums, or public unauthenticated photo access.
