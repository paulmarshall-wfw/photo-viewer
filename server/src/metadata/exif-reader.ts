import { ExifTool } from 'exiftool-vendored';

let exiftool: ExifTool | null = null;

export function getExifTool(): ExifTool {
  if (!exiftool) {
    exiftool = new ExifTool({ taskTimeoutMillis: 30000 });
  }
  return exiftool;
}

export async function closeExifTool(): Promise<void> {
  if (exiftool) {
    await exiftool.end();
    exiftool = null;
  }
}

export interface BasicExifData {
  dateTaken: string | null;
  width: number | null;
  height: number | null;
  title: string | null;
  caption: string | null;
}

export async function readBasicExif(filePath: string): Promise<BasicExifData> {
  const et = getExifTool();
  try {
    const tags = await et.read(filePath);

    let dateTaken: string | null = null;
    const dateField = tags.DateTimeOriginal || tags.CreateDate || tags.ModifyDate;
    if (dateField != null) {
      dateTaken = String(dateField);
    }

    const width = tags.ImageWidth ?? tags.ExifImageWidth ?? null;
    const height = tags.ImageHeight ?? tags.ExifImageHeight ?? null;

    const title = (tags as any).Title || (tags as any).ObjectName || null;
    const caption = (tags as any).Description || (tags as any).Caption || (tags as any).ImageDescription || null;

    return {
      dateTaken: dateTaken ? String(dateTaken) : null,
      width: width ? Number(width) : null,
      height: height ? Number(height) : null,
      title: title ? String(title) : null,
      caption: caption ? String(caption) : null,
    };
  } catch {
    return { dateTaken: null, width: null, height: null, title: null, caption: null };
  }
}
