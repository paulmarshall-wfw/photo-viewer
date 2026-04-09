import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const configTable = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  sessionToken: text('session_token').unique(),
  inviteToken: text('invite_token').unique(),
  inviteAcceptedAt: text('invite_accepted_at'),
  revokedAt: text('revoked_at'),
  createdAt: text('created_at').notNull(),
});

export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(),
  path: text('path').notNull().unique(),
  name: text('name').notNull(),
  parentPath: text('parent_path'),
  photoCount: integer('photo_count').notNull().default(0),
  firstPhotoId: text('first_photo_id'),
  indexedAt: text('indexed_at').notNull(),
});

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  folderPath: text('folder_path').notNull(),
  filename: text('filename').notNull(),
  filePath: text('file_path').notNull().unique(),
  fileSize: integer('file_size').notNull(),
  fileModifiedAt: text('file_modified_at').notNull(),
  format: text('format', { enum: ['jpeg', 'tiff', 'png', 'raw', 'psd'] }).notNull(),
  width: integer('width'),
  height: integer('height'),
  title: text('title'),
  caption: text('caption'),
  dateTaken: text('date_taken'),
  hasStory: integer('has_story', { mode: 'boolean' }).notNull().default(false),
  hasThumbnail: integer('has_thumbnail', { mode: 'boolean' }).notNull().default(false),
  hasPreview: integer('has_preview', { mode: 'boolean' }).notNull().default(false),
  thumbnailPath: text('thumbnail_path'),
  previewPath: text('preview_path'),
  indexedAt: text('indexed_at').notNull(),
}, (table) => [
  index('idx_photos_folder').on(table.folderPath),
  index('idx_photos_date').on(table.dateTaken),
  index('idx_photos_format').on(table.format),
]);

export const activity = sqliteTable('activity', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  photoId: text('photo_id').notNull(),
  action: text('action').notNull(),
  detail: text('detail'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_activity_created').on(table.createdAt),
  index('idx_activity_user').on(table.userId),
]);
