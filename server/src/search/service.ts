import { getSqlite } from '../db/connection.js';

export interface SearchParams {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  hasTitle?: boolean;
  needsTitle?: boolean;
  hasCaption?: boolean;
  needsCaption?: boolean;
  hasStory?: boolean;
  needsStory?: boolean;
  page: number;
  limit: number;
}

export function searchPhotos(params: SearchParams) {
  const sqlite = getSqlite();
  const conditions: string[] = [];
  const values: any[] = [];

  // Full-text search
  if (params.q) {
    conditions.push(`p.rowid IN (SELECT rowid FROM photos_fts WHERE photos_fts MATCH ?)`);
    values.push(params.q);
  }

  // Date range
  if (params.dateFrom) {
    conditions.push(`p.date_taken >= ?`);
    values.push(params.dateFrom);
  }
  if (params.dateTo) {
    conditions.push(`p.date_taken <= ?`);
    values.push(params.dateTo);
  }

  // Annotation status filters
  if (params.hasTitle) conditions.push(`p.title IS NOT NULL AND p.title != ''`);
  if (params.needsTitle) conditions.push(`(p.title IS NULL OR p.title = '')`);
  if (params.hasCaption) conditions.push(`p.caption IS NOT NULL AND p.caption != ''`);
  if (params.needsCaption) conditions.push(`(p.caption IS NULL OR p.caption = '')`);
  if (params.hasStory) conditions.push(`p.has_story = 1`);
  if (params.needsStory) conditions.push(`p.has_story = 0`);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (params.page - 1) * params.limit;

  const query = `
    SELECT p.*, f.name as folder_name
    FROM photos p
    LEFT JOIN folders f ON p.folder_path = f.path
    ${whereClause}
    ORDER BY p.date_taken DESC, p.filename ASC
    LIMIT ? OFFSET ?
  `;
  values.push(params.limit, offset);

  const rows = sqlite.prepare(query).all(...values);

  // Count total
  const countValues = values.slice(0, -2); // Remove limit and offset
  const countQuery = `SELECT count(*) as count FROM photos p ${whereClause}`;
  const total = sqlite.prepare(countQuery).get(...countValues) as any;

  return {
    results: rows.map((r: any) => ({
      id: r.id,
      folderPath: r.folder_path,
      filename: r.filename,
      filePath: r.file_path,
      fileSize: r.file_size,
      fileModifiedAt: r.file_modified_at,
      format: r.format,
      width: r.width,
      height: r.height,
      title: r.title,
      caption: r.caption,
      dateTaken: r.date_taken,
      hasStory: !!r.has_story,
      hasThumbnail: !!r.has_thumbnail,
      hasPreview: !!r.has_preview,
      location: r.location,
      orientationDeg: r.orientation_degrees ?? 0,
      indexedAt: r.indexed_at,
      folderName: r.folder_name,
    })),
    total: total?.count ?? 0,
  };
}
