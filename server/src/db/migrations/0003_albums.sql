CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  owner_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_albums_owner ON albums(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_albums_visibility ON albums(visibility);

CREATE TABLE IF NOT EXISTS album_folders (
  album_id TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  added_by_user_id TEXT NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (album_id, folder_path),
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_path) REFERENCES folders(path),
  FOREIGN KEY (added_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_album_folders_folder ON album_folders(folder_path);

CREATE TABLE IF NOT EXISTS album_photos (
  album_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  added_by_user_id TEXT NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (album_id, photo_id),
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
  FOREIGN KEY (photo_id) REFERENCES photos(id),
  FOREIGN KEY (added_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_album_photos_photo ON album_photos(photo_id);
