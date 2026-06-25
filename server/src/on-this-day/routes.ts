import type { FastifyInstance } from 'fastify';
import { getSqlite } from '../db/connection.js';

function todayMMDD(): { mm: string; dd: string; iso: string } {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const iso = `${d.getFullYear()}-${mm}-${dd}`;
  return { mm, dd, iso };
}

export async function onThisDayRoutes(app: FastifyInstance) {
  app.get('/api/on-this-day', async (request) => {
    const sqlite = getSqlite();
    const { mm, dd, iso } = todayMMDD();
    const userId = request.user!.id;

    const dismissedRow = sqlite.prepare(
      `SELECT 1 FROM dismissed_on_this_day WHERE user_id = ? AND dismissed_date = ?`
    ).get(userId, iso);

    // Match photos whose dateTaken month/day equals today (any year, excluding current year)
    const rows = sqlite.prepare(`
      SELECT *,
        CAST(SUBSTR(date_taken, 1, 4) AS INTEGER) AS year
      FROM photos
      WHERE date_taken IS NOT NULL
        AND SUBSTR(date_taken, 6, 2) = ?
        AND SUBSTR(date_taken, 9, 2) = ?
        AND CAST(SUBSTR(date_taken, 1, 4) AS INTEGER) < CAST(STRFTIME('%Y','now') AS INTEGER)
      ORDER BY date_taken DESC
      LIMIT 100
    `).all(mm, dd) as any[];

    return {
      photos: rows.map(r => ({
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
        year: r.year,
      })),
      dismissed: !!dismissedRow,
    };
  });

  app.post('/api/on-this-day/dismiss', async (request) => {
    const sqlite = getSqlite();
    const { iso } = todayMMDD();
    sqlite.prepare(
      `INSERT OR IGNORE INTO dismissed_on_this_day (user_id, dismissed_date) VALUES (?, ?)`
    ).run(request.user!.id, iso);
    return { success: true };
  });
}
