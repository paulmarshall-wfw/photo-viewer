# Photo Viewer — install on your home network

You will run a small web app on one always-on machine in your home (a Mac, a PC, a Linux box, or a NAS). Everyone in the family then opens it in their browser from any device on the same network.

You need three things:

1. **Docker** installed on the host machine.
2. **A folder of photos** on the host machine (or already mounted on a NAS).
3. **About 10 minutes** the first time.

---

## 1. Install Docker

| Host                | What to install                                                                 |
| ------------------- | ------------------------------------------------------------------------------- |
| macOS               | Docker Desktop — <https://docs.docker.com/desktop/install/mac-install/>         |
| Windows             | Docker Desktop — <https://docs.docker.com/desktop/install/windows-install/>     |
| Linux (Ubuntu etc.) | Docker Engine + Compose plugin — <https://docs.docker.com/engine/install/>      |
| Synology NAS        | "Container Manager" from Package Center                                         |
| QNAP NAS            | "Container Station" from App Center                                             |
| TrueNAS Scale       | Built in (uses K3s under the hood — Docker Compose templates work)              |
| Unraid              | Docker built in; install Compose Manager from Community Apps                    |

Verify it works:

```bash
docker --version
docker compose version
```

## 2. Get the deploy bundle

Download the latest `photo-viewer-deploy.zip` from the project's GitHub Releases page and extract it. You should end up with a folder containing:

```
photo-viewer-deploy/
├── docker-compose.yml
├── .env.example
├── scripts/
│   ├── install.sh / install.ps1
│   ├── upgrade.sh / upgrade.ps1
└── README-INSTALL.md   (this file)
```

## 3. Run the installer

Open a terminal in that folder and run:

| Host                | Command                              |
| ------------------- | ------------------------------------ |
| macOS / Linux / NAS | `bash scripts/install.sh`            |
| Windows             | `powershell -File scripts/install.ps1` |

The installer asks three questions:

- **Photo library path** — the absolute path to your photo folder on this machine.
  - macOS:    `/Users/yourname/Pictures/Family`
  - Windows:  `C:\Users\yourname\Pictures\Family`
  - Linux:    `/mnt/photos`
  - Synology: `/volume1/photo`
  - QNAP:     `/share/Multimedia`
- **Port** — defaults to `3000`. Pick something else if `3000` is taken.
- **Admin email + display name** — used for the first admin user.

It then:

1. Pulls the published image.
2. Starts the container.
3. Creates the admin account and saves the photo library path inside the app.
4. Prints the LAN URL you can open from any device.

> The library is mounted **read-only**. Photo Viewer never modifies your originals — comments, captions, and tags live in `./data/photo-viewer.db` next to the compose file.

## 4. Open it from any device

Open the LAN URL printed at the end of the install (e.g. `http://192.168.1.42:3000/`) on any phone, tablet, or computer on the same Wi-Fi. Log in with the admin email. From the in-app **Settings → Users** screen, generate invite links and share them with the rest of the family.

## NAS notes

### Synology — Container Manager

1. Copy the extracted `photo-viewer-deploy` folder onto the NAS (e.g. `/volume1/docker/photo-viewer`).
2. Container Manager → Project → Create.
3. Source: "Use existing docker-compose.yml". Point it at the file you just copied.
4. Edit `.env` first (DSM File Station works) and set `LIBRARY_PATH=/volume1/photo`, generate a `SESSION_SECRET`.
5. Start the project. Then SSH in and run:
   ```bash
   sudo docker compose -f /volume1/docker/photo-viewer/docker-compose.yml exec photo-viewer node /app/scripts/create-admin.mjs
   ```

### QNAP — Container Station

Same pattern via Container Station's "Application" → "Create from docker-compose.yml" flow. Use `LIBRARY_PATH=/share/Multimedia` (or wherever your photos live).

## Upgrading

When a new version is published, edit `.env` and bump `IMAGE_TAG` to the new version, then:

| Host    | Command                              |
| ------- | ------------------------------------ |
| Mac/Linux/NAS | `bash scripts/upgrade.sh`      |
| Windows | `powershell -File scripts/upgrade.ps1` |

Or run the script with an explicit tag: `bash scripts/upgrade.sh --tag 1.1.0`. Your `./data` (database + previews cache) and your photo library mount are preserved across upgrades.

## HTTPS on the LAN (optional)

Browsers nag on `http://`. The simplest fix is `mkcert`:

```bash
brew install mkcert nss            # macOS; choco install mkcert on Windows
mkcert -install                    # creates a local CA
mkcert photo-viewer.local 192.168.1.42
```

Then put the resulting cert + key in front of port 3000 with Caddy, nginx, or your NAS's reverse-proxy UI. (A Caddy compose snippet is on the project's README.)

## Troubleshooting

| Symptom                                | Likely cause                                      | Fix                                                                             |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `permission denied` on the library     | Container's `node` user (uid 1000) can't read it  | `chmod -R a+rX <library>` on the host, or run install with a matching uid        |
| Photos appear but no thumbnails        | ImageMagick missing on a custom build             | Use the published image; it ships ImageMagick                                   |
| Port 3000 in use                       | Some other app                                    | Edit `PORT=` in `.env`, then `docker compose up -d`                             |
| Browser says "untrusted certificate"   | Self-signed HTTPS                                 | Either skip HTTPS for v1 or follow the `mkcert` recipe above                    |
| Need to reset                          | —                                                 | `docker compose down && rm -rf data && bash scripts/install.sh`                 |
