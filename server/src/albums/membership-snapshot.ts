import { getSqlite } from '../db/connection.js';

export interface AlbumMembershipSnapshot {
  folders: {
    albumId: string;
    folderPath: string;
    addedByUserId: string;
    addedAt: string;
  }[];
  photos: {
    albumId: string;
    filePath: string;
    addedByUserId: string;
    addedAt: string;
  }[];
  photoExclusions: {
    albumId: string;
    filePath: string;
    excludedByUserId: string;
    excludedAt: string;
  }[];
}

export function snapshotAlbumMembershipByPath(): AlbumMembershipSnapshot {
  const sqlite = getSqlite();

  return {
    folders: sqlite.prepare(`
      SELECT album_id AS albumId,
             folder_path AS folderPath,
             added_by_user_id AS addedByUserId,
             added_at AS addedAt
      FROM album_folders
    `).all() as AlbumMembershipSnapshot['folders'],
    photos: sqlite.prepare(`
      SELECT ap.album_id AS albumId,
             p.file_path AS filePath,
             ap.added_by_user_id AS addedByUserId,
             ap.added_at AS addedAt
      FROM album_photos ap
      INNER JOIN photos p ON p.id = ap.photo_id
    `).all() as AlbumMembershipSnapshot['photos'],
    photoExclusions: sqlite.prepare(`
      SELECT ape.album_id AS albumId,
             p.file_path AS filePath,
             ape.excluded_by_user_id AS excludedByUserId,
             ape.excluded_at AS excludedAt
      FROM album_photo_exclusions ape
      INNER JOIN photos p ON p.id = ape.photo_id
    `).all() as AlbumMembershipSnapshot['photoExclusions'],
  };
}

export function restoreAlbumMembershipByPath(snapshot: AlbumMembershipSnapshot): void {
  const sqlite = getSqlite();

  const restoreFolder = sqlite.prepare(`
    INSERT OR IGNORE INTO album_folders (album_id, folder_path, added_by_user_id, added_at)
    SELECT ?, ?, ?, ?
    WHERE EXISTS (SELECT 1 FROM albums WHERE id = ?)
      AND EXISTS (SELECT 1 FROM folders WHERE path = ?)
  `);

  const restorePhoto = sqlite.prepare(`
    INSERT OR IGNORE INTO album_photos (album_id, photo_id, added_by_user_id, added_at)
    SELECT ?, p.id, ?, ?
    FROM photos p
    WHERE p.file_path = ?
      AND EXISTS (SELECT 1 FROM albums WHERE id = ?)
  `);

  const restorePhotoExclusion = sqlite.prepare(`
    INSERT OR IGNORE INTO album_photo_exclusions (album_id, photo_id, excluded_by_user_id, excluded_at)
    SELECT ?, p.id, ?, ?
    FROM photos p
    WHERE p.file_path = ?
      AND EXISTS (SELECT 1 FROM albums WHERE id = ?)
  `);

  const restore = sqlite.transaction(() => {
    for (const folder of snapshot.folders) {
      restoreFolder.run(
        folder.albumId,
        folder.folderPath,
        folder.addedByUserId,
        folder.addedAt,
        folder.albumId,
        folder.folderPath,
      );
    }

    for (const photo of snapshot.photos) {
      restorePhoto.run(
        photo.albumId,
        photo.addedByUserId,
        photo.addedAt,
        photo.filePath,
        photo.albumId,
      );
    }

    for (const exclusion of snapshot.photoExclusions) {
      restorePhotoExclusion.run(
        exclusion.albumId,
        exclusion.excludedByUserId,
        exclusion.excludedAt,
        exclusion.filePath,
        exclusion.albumId,
      );
    }
  });

  restore();
}
