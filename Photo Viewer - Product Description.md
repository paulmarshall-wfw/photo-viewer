# Photo Viewer — Product Description

## Overview

Photo Viewer is a self-hosted web application that allows family and friends to browse, view, and collaboratively annotate a shared photo collection. An admin deploys the app once, pointed at a photo repository (local folder or network-accessible NAS), and shares access via invite links. Users access the app through any modern web browser — no installation required.

The core purpose is to make it easy for a group of people to explore thousands of photos organised in folders, view them at high resolution, and collectively build a record of titles, captions, dates, and stories for each image.

---

## Architecture

- **Self-hosted web app** — a single Node.js server that serves the browser UI and handles all photo processing
- **Browser-based access** — users connect via a URL; no desktop or mobile app to distribute
- **Photo storage** — the server reads photos from a configured directory (local filesystem or mounted NAS path)
- **Metadata storage** — all metadata is stored in XMP sidecar files alongside the original images; original image files are never modified
- **Index database** — a SQLite database caches folder structures, metadata, and thumbnail paths for fast search and navigation at scale

---

## User Management & Authentication

### Admin

- The first user to set up the app becomes the admin
- The admin configures the photo storage location (see Storage Configuration below)
- The admin manages users from a simple admin panel:
  - Add users by email address, generating a one-time invite link
  - View all active users
  - Revoke access for any user
  - Re-send invite links

### Users

- Users receive an invite link via email (sent manually by the admin or copied from the admin panel)
- Clicking the invite link, the user sets a display name and is logged in with a long-lived session token (cookie-based)
- No passwords — authentication is token-based
- Sessions persist until revoked by the admin
- All edits (titles, captions, dates, stories) are attributed to the user who made them

---

## Storage Configuration

- The photo storage location (filesystem path) is configured by the admin during initial setup
- Only the admin can change the storage location
- Changing the location triggers a re-index of the new directory

---

## Photo Format Support

The app supports the following image formats:

- **JPEG** (.jpg, .jpeg)
- **TIFF** (.tif, .tiff)
- **PNG** (.png)
- **Camera raw files** — CR2, CR3 (Canon), NEF (Nikon), ARW (Sony), RAF (Fujifilm), ORF (Olympus), DNG (Adobe), RW2 (Panasonic), and other common raw formats

### Display Strategy

- **Embedded JPEG previews**: For raw files and other formats that contain an embedded JPEG preview, extract and use this as the display image. These are typically high resolution (often full sensor resolution) and fast to extract.
- **Generated previews**: When no embedded preview is available (or it is too low resolution), the server generates a high-quality JPEG preview using server-side image processing (libraw/dcraw for raw files, sharp/vips for TIFF/PNG).
- **Preview resolution**: Generated previews target a resolution suitable for full-screen display (e.g., 3840px on the long edge) to ensure sharp viewing on modern displays.
- **Caching**: All generated previews are cached on disk to avoid repeated processing. Previews are generated on first access.
- **Thumbnails**: Smaller thumbnail versions (e.g., 400px) are generated and cached separately for use in folder browsing and the thumbnail strip.

---

## Navigation & Browsing

### Folder Navigation

- **Breadcrumb bar** at the top of the screen shows the current path (e.g., Home > 2019 > Summer > Beach Trip) — each segment is clickable for quick navigation up the hierarchy
- **Left panel** displays subfolders of the current directory:
  - Each subfolder shows its name, a photo count, and a thumbnail preview of the first image
  - Clicking a subfolder navigates into it
  - Supports unlimited nesting depth
- **Right panel** displays the images in the current folder as a thumbnail grid/strip
  - Clicking a thumbnail opens that image in the main viewer

### Thumbnail Strip

- When viewing an image, a scrollable thumbnail strip at the bottom (or side) shows all images in the current folder
- The active image is highlighted
- Users can click any thumbnail to jump to that image
- Arrow keys or swipe gestures navigate to the next/previous image

---

## Image Viewer

### Display

- The selected image occupies most of the screen
- **Title** displayed above the image
- **Caption** displayed below the image
- **Theme toggle**: white or black background
  - White background: image displayed with a thin black frame
  - Black background: image displayed with a thin white frame
- Clean, minimalist design with controls hidden or subtle until hovered/tapped

### Full-Screen Mode

- A full-screen button expands the image to fill the entire display
- In full-screen mode, the image is shown at the highest available resolution
- Title, caption, and navigation controls overlay on hover/tap and auto-hide
- Exit full-screen via button, Escape key, or swipe gesture

### Information Panel

- A medium-sized **"i" (information) button** toggles an information overlay or side panel
- The panel displays:
  - **Date Taken** — read from image metadata
  - **Image Story** — a longer narrative or set of memories associated with the image
  - **Edited by** — who last edited each field and when
- Both Date Taken and Image Story are editable from this panel (see Metadata Editing below)

---

## Metadata & Stories

### Storage

All metadata is stored in **XMP sidecar files** (`.xmp`) alongside the original image files. Original images are never modified.

- **Title** — stored in XMP (`dc:title`)
- **Caption** — stored in XMP (`dc:description`)
- **Date Taken** — stored in XMP (`photoshop:DateCreated` / `exif:DateTimeOriginal`)
- **Image Story** — stored in a sidecar file (`.story.md`) alongside the image, as Markdown text

### Editing

- Title and Caption are editable inline from the main viewer — click the text to edit
- Date Taken and Image Story are editable from the information panel
- All edits are saved immediately
- All edits are attributed to the user who made them (stored in the sidecar)

### Stories — Multi-Contributor Model

- Image stories support **multiple contributions** — each user can append their own memories or narrative to a photo's story
- Each contribution is attributed (name and date)
- Contributors can edit or delete their own entries
- The admin can edit or delete any entry
- Stories are stored as Markdown, supporting basic formatting (paragraphs, bold, italic, lists)

---

## Search

- **Full-text search** across titles, captions, stories, and folder names
- **Date range search** — find photos between two dates
- **Filter by status**:
  - Has title / needs title
  - Has caption / needs caption
  - Has story / needs story
- Search results display as a thumbnail grid with folder path shown beneath each result

---

## Sorting

Within any folder, images can be sorted by:

- Date taken (ascending/descending)
- Filename (ascending/descending)
- Annotation status ("needs caption" first — useful for annotation sessions)

---

## Progress Tracking

- A progress indicator shows annotation completeness, e.g.:
  - "347 of 2,100 photos have titles"
  - "892 of 2,100 photos have captions"
  - "124 of 2,100 photos have stories"
- Available at the folder level and across the entire collection
- Motivates contributors and helps identify areas that need attention

---

## Activity Feed

- A "Recent Activity" view shows the latest edits across the collection:
  - "Carol added a story to 'Beach 1987/sunset.jpg' — 2 hours ago"
  - "David updated the caption on '2019/Christmas/tree.jpg' — yesterday"
- Filterable by user
- Builds engagement and helps avoid duplicate effort

---

## Slideshow Mode

- A slideshow mode auto-advances through images in the current folder
- Configurable interval (e.g., 5, 10, 15 seconds)
- Displays title and caption during slideshow
- Runs in full-screen
- Pause/resume and manual advance controls

---

## Download Original

- A download button allows any user to save a full-resolution copy of the original image file to their device
- Downloads the actual original file (including raw files), not the generated preview

---

## Technical Summary

| Component          | Technology                                  |
|--------------------|---------------------------------------------|
| Server             | Node.js                                     |
| Frontend           | Browser-based SPA (React or similar)        |
| Database           | SQLite (metadata cache and index)           |
| Image processing   | sharp, libraw/dcraw                         |
| Metadata           | XMP sidecar files (.xmp), story files (.story.md) |
| Authentication     | Token-based sessions, invite links          |
| Photo storage      | Local filesystem or mounted NAS path        |

---

Each deployment is completely independent:

Self-contained: One folder with the server code, a SQLite database, and a cache directory. No external database servers or shared services.
Per-instance configuration: Each deployment has its own photos path, its own users, its own admin.
Deploy anywhere Node.js runs: Copy the built package to a new server, run npm start, go through the setup flow for that family's photo collection.
To make this even smoother, I'd add to the plan:

Build/package script — npm run build produces a single deployable folder (dist/) containing the compiled server, bundled client, and a package.json with only production dependencies. Copy that folder to any machine, run npm install --production && npm start.

Docker image (optional) — A Dockerfile that bundles everything into a container. Deploy with a single command: docker run -v /path/to/photos:/photos -p 3000:3000 photo-viewer. This is the easiest way to hand someone a ready-to-run package.

Environment-based config — The photos path, port, and other settings come from environment variables or a .env file, so each instance is configured independently without editing code.

---

## Non-Goals (Explicitly Out of Scope)

- Photo uploading or import (the app reads from an existing folder structure)
- Photo editing or cropping
- Album creation or virtual collections (the folder structure is the organisation)
- Social features beyond stories (no comments, likes, or sharing)
- Mobile-native apps (the web app should be responsive and work on mobile browsers)
