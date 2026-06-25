import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';

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
  location: text('location'),
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

export const peopleTags = sqliteTable('people_tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const photoPeopleTags = sqliteTable('photo_people_tags', {
  photoId: text('photo_id').notNull(),
  tagId: text('tag_id').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_photo_people_tags_tag').on(table.tagId),
]);

export const reactions = sqliteTable('reactions', {
  id: text('id').primaryKey(),
  photoId: text('photo_id').notNull(),
  userId: text('user_id').notNull(),
  emoji: text('emoji').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_reactions_photo').on(table.photoId),
]);

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  photoId: text('photo_id').notNull(),
  userId: text('user_id').notNull(),
  parentCommentId: text('parent_comment_id'),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_comments_photo_created').on(table.photoId, table.createdAt),
  index('idx_comments_parent').on(table.parentCommentId),
]);

export const photoFollows = sqliteTable('photo_follows', {
  photoId: text('photo_id').notNull(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_photo_follows_user').on(table.userId),
]);

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  photoId: text('photo_id').notNull(),
  actorId: text('actor_id').notNull(),
  actionType: text('action_type').notNull(),
  detail: text('detail'),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_notifications_user_read').on(table.userId, table.read),
  index('idx_notifications_user_created').on(table.userId, table.createdAt),
]);

export const dismissedOnThisDay = sqliteTable('dismissed_on_this_day', {
  userId: text('user_id').notNull(),
  dismissedDate: text('dismissed_date').notNull(),
});

export const albums = sqliteTable('albums', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  visibility: text('visibility', { enum: ['private', 'shared'] }).notNull().default('private'),
  ownerUserId: text('owner_user_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_albums_owner').on(table.ownerUserId),
  index('idx_albums_visibility').on(table.visibility),
]);

export const albumFolders = sqliteTable('album_folders', {
  albumId: text('album_id').notNull(),
  folderPath: text('folder_path').notNull(),
  addedByUserId: text('added_by_user_id').notNull(),
  addedAt: text('added_at').notNull(),
}, (table) => [
  primaryKey({ columns: [table.albumId, table.folderPath] }),
  index('idx_album_folders_folder').on(table.folderPath),
]);

export const albumPhotos = sqliteTable('album_photos', {
  albumId: text('album_id').notNull(),
  photoId: text('photo_id').notNull(),
  addedByUserId: text('added_by_user_id').notNull(),
  addedAt: text('added_at').notNull(),
}, (table) => [
  primaryKey({ columns: [table.albumId, table.photoId] }),
  index('idx_album_photos_photo').on(table.photoId),
]);
