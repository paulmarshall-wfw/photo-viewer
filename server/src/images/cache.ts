import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export function getThumbnailPath(photoId: string): string {
  return path.join(config.thumbnailsDir, `${photoId}.jpg`);
}

export function getPreviewPath(photoId: string): string {
  return path.join(config.previewsDir, `${photoId}.jpg`);
}

export function hasCachedThumbnail(photoId: string): boolean {
  return fs.existsSync(getThumbnailPath(photoId));
}

export function hasCachedPreview(photoId: string): boolean {
  return fs.existsSync(getPreviewPath(photoId));
}
