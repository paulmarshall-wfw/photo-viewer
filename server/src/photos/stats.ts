import { getSqlite } from '../db/connection.js';

export interface AnnotationProgress {
  totalPhotos: number;
  withTitle: number;
  withCaption: number;
  withStory: number;
}

export function getGlobalStats(): AnnotationProgress {
  const sqlite = getSqlite();
  const row = sqlite.prepare(`
    SELECT
      count(*) as total,
      sum(CASE WHEN title IS NOT NULL AND title != '' THEN 1 ELSE 0 END) as with_title,
      sum(CASE WHEN caption IS NOT NULL AND caption != '' THEN 1 ELSE 0 END) as with_caption,
      sum(CASE WHEN has_story = 1 THEN 1 ELSE 0 END) as with_story
    FROM photos
  `).get() as any;

  return {
    totalPhotos: row?.total ?? 0,
    withTitle: row?.with_title ?? 0,
    withCaption: row?.with_caption ?? 0,
    withStory: row?.with_story ?? 0,
  };
}

export function getFolderStats(folderPath: string): AnnotationProgress {
  const sqlite = getSqlite();
  const row = sqlite.prepare(`
    SELECT
      count(*) as total,
      sum(CASE WHEN title IS NOT NULL AND title != '' THEN 1 ELSE 0 END) as with_title,
      sum(CASE WHEN caption IS NOT NULL AND caption != '' THEN 1 ELSE 0 END) as with_caption,
      sum(CASE WHEN has_story = 1 THEN 1 ELSE 0 END) as with_story
    FROM photos
    WHERE folder_path = ?
  `).get(folderPath) as any;

  return {
    totalPhotos: row?.total ?? 0,
    withTitle: row?.with_title ?? 0,
    withCaption: row?.with_caption ?? 0,
    withStory: row?.with_story ?? 0,
  };
}
