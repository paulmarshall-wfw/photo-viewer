import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  dataDir: process.env.DATA_DIR || path.resolve(__dirname, '../data'),
  sessionSecret: process.env.SESSION_SECRET || 'photo-viewer-default-secret-change-me-in-production!!',
  // When set (typically by a launcher that already bind-mounts the host
  // photo folder), Setup hides the folder picker and uses this path.
  setupLibraryPath: process.env.SETUP_LIBRARY_PATH || null,
  get dbPath() {
    return path.join(this.dataDir, 'photo-viewer.db');
  },
  get cacheDir() {
    return path.join(this.dataDir, 'cache');
  },
  get previewsDir() {
    return path.join(this.cacheDir, 'previews');
  },
  get thumbnailsDir() {
    return path.join(this.cacheDir, 'thumbnails');
  },
};
