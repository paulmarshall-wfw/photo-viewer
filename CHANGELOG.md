# Changelog

## v1.0.3 — 2026-04-28

- When the photos path changes (Settings → Storage Location → Update,
  in non-launcher installs), wipe all data derived from the previous
  library so the gallery returns to a blank "Run Indexer" state. Wipes
  photos, folders, photos_fts, reactions, comments, photo-tag links,
  photo follows, notifications, on-this-day dismissals, and the
  on-disk previews + thumbnails caches. Preserves users, people-tag
  definitions, and activity history.
- Closes the v1.0.2 edge case where stale photo rows pointing at the
  old folder remained visible until a manual re-index.

## v1.0.2 — 2026-04-28

- Lock Settings → Storage Location when the server is launched with
  `SETUP_LIBRARY_PATH` set. The folder picker is replaced with a
  read-only display of the bind-mount path. The `PUT /api/admin/config`
  endpoint refuses changes in launcher-managed mode (HTTP 409).
- Closes the v1.0.1 gap where Settings still showed an unusable picker
  (the container can only see the launcher's bind mount).

## v1.0.1 — 2026-04-26

- Hide the in-app folder picker on Setup when the server is launched with
  `SETUP_LIBRARY_PATH` set. Launcher-managed deployments (e.g. AppLauncher
  with a host bind-mount) now collect only name and email at first run; the
  pre-bound library path is used automatically.
- AppLauncher manifest: add `SETUP_LIBRARY_PATH=/library` to the primary
  service environment so the launcher-installed flow skips the picker.
- Bump deploy bundle's default `IMAGE_TAG` to `1.0.1`.

## v1.0.0 — 2026-04-26

- Initial public release.
- Photo Viewer is a self-hosted family photo annotation web app distributed
  as a multi-arch Docker image (`linux/amd64` + `linux/arm64`) on GHCR.
- Five family storytelling features: Reactions & Comments, Photo Following
  + in-app Notifications, On This Day, People & Places Tagging, Timeline
  View with year/decade markers.
- Recipient deploy bundle: `docker-compose.yml`, `.env.example`, install /
  upgrade scripts for macOS, Linux, and Windows, plus a NAS-friendly README.
- AppLauncher manifest published for direct launcher install.
