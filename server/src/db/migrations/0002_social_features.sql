-- Location column on photos
ALTER TABLE photos ADD COLUMN location TEXT;

-- People tags (keyword-style)
CREATE TABLE IF NOT EXISTS people_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS photo_people_tags (
  photo_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (photo_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_photo_people_tags_tag ON photo_people_tags(tag_id);

-- Reactions
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (photo_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reactions_photo ON reactions(photo_id);

-- Comments (one level of threading)
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  parent_comment_id TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_photo_created ON comments(photo_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

-- Photo follows
CREATE TABLE IF NOT EXISTS photo_follows (
  photo_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (photo_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_photo_follows_user ON photo_follows(user_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  detail TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at);

-- Dismissed On This Day (per user, per calendar day)
CREATE TABLE IF NOT EXISTS dismissed_on_this_day (
  user_id TEXT NOT NULL,
  dismissed_date TEXT NOT NULL,
  PRIMARY KEY (user_id, dismissed_date)
);
