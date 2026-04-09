CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  session_token TEXT UNIQUE,
  invite_token TEXT UNIQUE,
  invite_accepted_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_path TEXT,
  photo_count INTEGER NOT NULL DEFAULT 0,
  first_photo_id TEXT,
  indexed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  folder_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL,
  file_modified_at TEXT NOT NULL,
  format TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  title TEXT,
  caption TEXT,
  date_taken TEXT,
  has_story INTEGER NOT NULL DEFAULT 0,
  has_thumbnail INTEGER NOT NULL DEFAULT 0,
  has_preview INTEGER NOT NULL DEFAULT 0,
  thumbnail_path TEXT,
  preview_path TEXT,
  indexed_at TEXT NOT NULL,
  FOREIGN KEY (folder_path) REFERENCES folders(path)
);

CREATE INDEX IF NOT EXISTS idx_photos_folder ON photos(folder_path);
CREATE INDEX IF NOT EXISTS idx_photos_date ON photos(date_taken);
CREATE INDEX IF NOT EXISTS idx_photos_format ON photos(format);

CREATE VIRTUAL TABLE IF NOT EXISTS photos_fts USING fts5(
  title, caption, story_text, folder_name, filename,
  content='photos',
  content_rowid='rowid'
);

CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (photo_id) REFERENCES photos(id)
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id);
