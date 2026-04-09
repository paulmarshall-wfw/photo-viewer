import fs from 'node:fs';
import path from 'node:path';
import { getExifTool } from '../metadata/exif-reader.js';

function makeTempPath(rawFilePath: string): string {
  const tempDir = path.dirname(rawFilePath);
  const tempName = `.pv_preview_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  return path.join(tempDir, tempName);
}

function tryCleanup(filePath: string): void {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

function readAndCleanup(filePath: string, minBytes: number): Buffer | null {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  fs.unlinkSync(filePath);
  return buffer.length >= minBytes ? buffer : null;
}

/**
 * Attempts to extract an embedded JPEG preview from a raw file.
 * Tries multiple extraction methods in order of expected quality:
 *   1. extractJpgFromRaw — works for most camera raw formats (NEF, CR2, ARW, etc.)
 *   2. extractPreview — works for DNG and other formats with a PreviewImage tag
 *   3. extractThumbnail — last resort, usually very small
 *
 * Returns the extracted JPEG as a Buffer, or null if not available.
 */
export async function extractEmbeddedPreview(rawFilePath: string): Promise<Buffer | null> {
  const et = getExifTool();

  // Method 1: extractJpgFromRaw (best for NEF, CR2, ARW, etc.)
  {
    const tempPath = makeTempPath(rawFilePath);
    try {
      await et.extractJpgFromRaw(rawFilePath, tempPath);
      const buf = readAndCleanup(tempPath, 10_000);
      if (buf) return buf;
    } catch {
      tryCleanup(tempPath);
    }
  }

  // Method 2: extractPreview (best for DNG — extracts PreviewImage tag)
  {
    const tempPath = makeTempPath(rawFilePath);
    try {
      await et.extractPreview(rawFilePath, tempPath);
      const buf = readAndCleanup(tempPath, 10_000);
      if (buf) return buf;
    } catch {
      tryCleanup(tempPath);
    }
  }

  // Method 3: extractThumbnail (last resort)
  {
    const tempPath = makeTempPath(rawFilePath);
    try {
      await et.extractThumbnail(rawFilePath, tempPath);
      const buf = readAndCleanup(tempPath, 5_000);
      if (buf) return buf;
    } catch {
      tryCleanup(tempPath);
    }
  }

  return null;
}
