CREATE TABLE IF NOT EXISTS album_photo_exclusions (
  album_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  excluded_by_user_id TEXT NOT NULL,
  excluded_at TEXT NOT NULL,
  PRIMARY KEY (album_id, photo_id),
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
  FOREIGN KEY (photo_id) REFERENCES photos(id),
  FOREIGN KEY (excluded_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_album_photo_exclusions_photo ON album_photo_exclusions(photo_id);
