import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { PREVIEW_MAX_DIMENSION, THUMBNAIL_MAX_DIMENSION, PREVIEW_JPEG_QUALITY, THUMBNAIL_JPEG_QUALITY } from '@photo-viewer/shared';
import { getThumbnailPath, getPreviewPath } from './cache.js';
import { getExifTool } from '../metadata/exif-reader.js';

const execFileAsync = promisify(execFile);

/**
 * For TIFF-based raw files (DNG especially), sharp reads the main IFD by
 * default, which is often just a tiny thumbnail (e.g. 160x120). The actual
 * full-resolution image may be in a SubIFD or alternate page.
 *
 * This function finds the best readable source by checking pages and subIFDs,
 * and verifying sharp can actually process each one (some subIFDs contain raw
 * Bayer data that sharp can't convert to sRGB).
 */
async function findBestSource(sourcePath: string): Promise<{ page?: number; subifd?: number }> {
  try {
    const defaultMeta = await sharp(sourcePath, { failOn: 'none' }).metadata();
    let bestPixels = (defaultMeta.width || 0) * (defaultMeta.height || 0);
    let bestOpts: { page?: number; subifd?: number } = {};

    // Check additional pages
    if (defaultMeta.pages && defaultMeta.pages > 1) {
      for (let page = 1; page < defaultMeta.pages; page++) {
        try {
          const pm = await sharp(sourcePath, { failOn: 'none', page }).metadata();
          const pixels = (pm.width || 0) * (pm.height || 0);
          if (pixels > bestPixels) {
            bestPixels = pixels;
            bestOpts = { page };
          }
        } catch {}
      }
    }

    // Check subIFDs — but verify they're actually processable
    for (let subifd = 0; subifd < 4; subifd++) {
      try {
        const sm = await sharp(sourcePath, { failOn: 'none', subifd } as any).metadata();
        const pixels = (sm.width || 0) * (sm.height || 0);
        if (pixels > bestPixels) {
          // Verify sharp can actually process this subIFD (not raw Bayer data)
          await sharp(sourcePath, { failOn: 'none', subifd } as any)
            .resize({ width: 16, height: 16, fit: 'inside' })
            .jpeg()
            .toBuffer();
          bestPixels = pixels;
          bestOpts = { subifd };
        }
      } catch {
        // SubIFD not readable or contains raw data — skip it
        if (subifd > 1) break;
      }
    }

    return bestOpts;
  } catch {
    return {};
  }
}

export async function generateThumbnail(sourcePath: string, photoId: string): Promise<string> {
  const outputPath = getThumbnailPath(photoId);
  const opts = await findBestSource(sourcePath);
  await sharp(sourcePath, { failOn: 'none', ...opts } as any)
    .rotate()
    .resize({
      width: THUMBNAIL_MAX_DIMENSION,
      height: THUMBNAIL_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: THUMBNAIL_JPEG_QUALITY })
    .toFile(outputPath);
  return outputPath;
}

export async function generatePreview(sourcePath: string, photoId: string): Promise<string> {
  const outputPath = getPreviewPath(photoId);
  const opts = await findBestSource(sourcePath);
  await sharp(sourcePath, { failOn: 'none', ...opts } as any)
    .rotate()
    .resize({
      width: PREVIEW_MAX_DIMENSION,
      height: PREVIEW_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: PREVIEW_JPEG_QUALITY })
    .toFile(outputPath);
  return outputPath;
}

// Generate from a buffer (e.g., embedded JPEG extracted from raw)
export async function generateThumbnailFromBuffer(buffer: Buffer, photoId: string): Promise<string> {
  const outputPath = getThumbnailPath(photoId);
  await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: THUMBNAIL_MAX_DIMENSION,
      height: THUMBNAIL_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: THUMBNAIL_JPEG_QUALITY })
    .toFile(outputPath);
  return outputPath;
}

export async function generatePreviewFromBuffer(buffer: Buffer, photoId: string): Promise<string> {
  const outputPath = getPreviewPath(photoId);
  await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: PREVIEW_MAX_DIMENSION,
      height: PREVIEW_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: PREVIEW_JPEG_QUALITY })
    .toFile(outputPath);
  return outputPath;
}

/**
 * Validate that an image buffer contains a real photograph (not corrupt colored bars).
 * Checks color channel variance — corrupt qlmanage output produces flat horizontal bands
 * with extremely low per-row variance.
 */
async function isImageContentValid(buffer: Buffer): Promise<boolean> {
  try {
    const { data, info } = await sharp(buffer, { failOn: 'none' })
      .resize({ width: 64, height: 64, fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Sample pixels and check that there's meaningful spatial variation
    // Corrupt qlmanage output has horizontal color bands — very uniform per row
    const channels = info.channels;
    let totalVariance = 0;
    const rowWidth = info.width * channels;

    for (let y = 0; y < info.height; y += 4) {
      for (let c = 0; c < channels && c < 3; c++) {
        let sum = 0;
        let sumSq = 0;
        const count = info.width;
        for (let x = 0; x < info.width; x++) {
          const val = data[y * rowWidth + x * channels + c];
          sum += val;
          sumSq += val * val;
        }
        const mean = sum / count;
        const variance = sumSq / count - mean * mean;
        totalVariance += variance;
      }
    }

    const avgVariance = totalVariance / (Math.ceil(info.height / 4) * Math.min(channels, 3));
    // Real photos typically have row variance > 100; corrupt color bands have < 20
    return avgVariance > 50;
  } catch {
    return false;
  }
}

/**
 * Convert PSD/PSB files to a buffer using macOS tools.
 * Tries sips first (fast), then qlmanage (Quick Look), then extracts
 * the embedded PhotoshopThumbnail via exiftool as a last resort.
 */
async function convertPsdToBuffer(sourcePath: string, maxDimension: number): Promise<Buffer> {
  // Method 1: sips (fast, but can't handle all PSD/PSB files — especially 16-bit PSB)
  const tmpJpg = path.join(os.tmpdir(), `pv_sips_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
  try {
    await execFileAsync('sips', [
      '-s', 'format', 'jpeg',
      '-Z', String(maxDimension),
      sourcePath,
      '--out', tmpJpg,
    ]);
    const buffer = fs.readFileSync(tmpJpg);
    if (buffer.length < 1000 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      throw new Error('sips produced invalid JPEG output');
    }
    if (!await isImageContentValid(buffer)) {
      throw new Error('sips produced corrupt image content');
    }
    return buffer;
  } catch {
    // sips failed or produced corrupt output
  } finally {
    if (fs.existsSync(tmpJpg)) fs.unlinkSync(tmpJpg);
  }

  // Method 2: qlmanage (Quick Look)
  const tmpDir = path.join(os.tmpdir(), `pv_ql_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    await execFileAsync('qlmanage', ['-t', '-s', String(maxDimension), '-o', tmpDir, sourcePath]);
    const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.png'));
    if (files.length === 0) throw new Error('qlmanage produced no output');
    const buffer = fs.readFileSync(path.join(tmpDir, files[0]));
    if (!await isImageContentValid(buffer)) {
      throw new Error('qlmanage produced corrupt image content');
    }
    return buffer;
  } catch {
    // qlmanage failed or produced corrupt output
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // Method 3: Extract embedded PhotoshopThumbnail via exiftool
  // This is small (typically ~160px) but better than nothing
  const tmpThumb = path.join(os.tmpdir(), `pv_psthumb_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
  try {
    const et = getExifTool();
    await et.extractBinaryTag('PhotoshopThumbnail', sourcePath, tmpThumb);
    if (fs.existsSync(tmpThumb) && fs.statSync(tmpThumb).size > 0) {
      return fs.readFileSync(tmpThumb);
    }
  } catch {
    // No embedded thumbnail
  } finally {
    if (fs.existsSync(tmpThumb)) fs.unlinkSync(tmpThumb);
  }

  throw new Error(`Failed to convert PSD/PSB file: ${path.basename(sourcePath)}`);
}

export async function generateThumbnailFromPsd(sourcePath: string, photoId: string): Promise<string> {
  const outputPath = getThumbnailPath(photoId);
  const buffer = await convertPsdToBuffer(sourcePath, THUMBNAIL_MAX_DIMENSION);
  await sharp(buffer, { failOn: 'none' })
    .resize({
      width: THUMBNAIL_MAX_DIMENSION,
      height: THUMBNAIL_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: THUMBNAIL_JPEG_QUALITY })
    .toFile(outputPath);
  return outputPath;
}

export async function generatePreviewFromPsd(sourcePath: string, photoId: string): Promise<string> {
  const outputPath = getPreviewPath(photoId);
  const buffer = await convertPsdToBuffer(sourcePath, PREVIEW_MAX_DIMENSION);
  await sharp(buffer, { failOn: 'none' })
    .resize({
      width: PREVIEW_MAX_DIMENSION,
      height: PREVIEW_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: PREVIEW_JPEG_QUALITY })
    .toFile(outputPath);
  return outputPath;
}
