import type { ImageFormat } from './types.js';

export const SUPPORTED_EXTENSIONS: Record<string, ImageFormat> = {
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.tif': 'tiff',
  '.tiff': 'tiff',
  '.png': 'png',
  // Canon
  '.cr2': 'raw',
  '.cr3': 'raw',
  // Nikon
  '.nef': 'raw',
  // Sony
  '.arw': 'raw',
  // Fujifilm
  '.raf': 'raw',
  // Olympus
  '.orf': 'raw',
  // Adobe
  '.dng': 'raw',
  // Panasonic
  '.rw2': 'raw',
  // Adobe Photoshop
  '.psd': 'psd',
  '.psb': 'psd',
};

export const PREVIEW_MAX_DIMENSION = 3840;
export const THUMBNAIL_MAX_DIMENSION = 400;
export const PREVIEW_JPEG_QUALITY = 85;
export const THUMBNAIL_JPEG_QUALITY = 80;

export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 500;

export const SESSION_COOKIE_NAME = 'pv_session';
export const SESSION_MAX_AGE_DAYS = 365;

export const SLIDESHOW_INTERVALS = [2, 5, 10, 15, 30];
