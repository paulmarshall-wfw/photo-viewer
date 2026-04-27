# Changelog

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
