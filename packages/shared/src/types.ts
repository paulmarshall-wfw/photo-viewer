export interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'user';
  inviteAcceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface Folder {
  id: string;
  path: string;
  name: string;
  parentPath: string | null;
  photoCount: number;
  firstPhotoId: string | null;
  indexedAt: string;
}

export interface Photo {
  id: string;
  folderPath: string;
  filename: string;
  filePath: string;
  fileSize: number;
  fileModifiedAt: string;
  format: ImageFormat;
  width: number | null;
  height: number | null;
  title: string | null;
  caption: string | null;
  dateTaken: string | null;
  hasStory: boolean;
  hasThumbnail: boolean;
  hasPreview: boolean;
  location: string | null;
  orientationDeg: OrientationDegrees;
  indexedAt: string;
  reactionCount?: number;
  commentCount?: number;
}

export interface StoryEntry {
  author: string;
  date: string;
  content: string;
  index: number;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  userDisplayName: string;
  photoId: string;
  photoFilename: string;
  photoFolderPath: string;
  action: ActivityAction;
  detail: string | null;
  createdAt: string;
}

export type ImageFormat = 'jpeg' | 'tiff' | 'png' | 'raw' | 'psd';
export type OrientationDegrees = 0 | 90 | 180 | 270;

export type ActivityAction =
  | 'set_title'
  | 'set_caption'
  | 'set_date'
  | 'add_story'
  | 'edit_story'
  | 'delete_story'
  | 'add_reaction'
  | 'remove_reaction'
  | 'add_comment'
  | 'delete_comment'
  | 'add_people_tag'
  | 'remove_people_tag'
  | 'set_location'
  | 'set_orientation';

export type SortField = 'date' | 'filename' | 'annotation' | 'timeline';
export type SortOrder = 'asc' | 'desc';
export type Theme = 'light' | 'dark';

export interface PeopleTag {
  id: string;
  name: string;
}

export interface Reaction {
  id: string;
  photoId: string;
  userId: string;
  userDisplayName: string;
  emoji: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  photoId: string;
  userId: string;
  userDisplayName: string;
  parentCommentId: string | null;
  body: string;
  createdAt: string;
  replies: Comment[];
}

export type NotificationActionType =
  | 'reaction'
  | 'comment'
  | 'reply'
  | 'people_tag'
  | 'set_title'
  | 'set_caption'
  | 'add_story'
  | 'edit_story'
  | 'set_location';

export interface Notification {
  id: string;
  userId: string;
  photoId: string;
  photoFilename: string;
  photoFolderPath: string;
  actorId: string;
  actorDisplayName: string;
  actionType: NotificationActionType;
  detail: string | null;
  read: boolean;
  createdAt: string;
}

export interface OnThisDayPhoto extends Photo {
  year: number;
}

export interface AnnotationProgress {
  totalPhotos: number;
  withTitle: number;
  withCaption: number;
  withStory: number;
}

export type AlbumVisibility = 'private' | 'shared';

export interface Album {
  id: string;
  name: string;
  visibility: AlbumVisibility;
  ownerUserId: string;
  ownerDisplayName: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
}

export interface AlbumSummary extends Album {
  folderCount: number;
  explicitPhotoCount: number;
  resolvedPhotoCount: number;
}

export interface AlbumFolder {
  albumId: string;
  folderPath: string;
  folderName: string | null;
  photoCount: number;
  addedByUserId: string;
  addedAt: string;
}

export interface AlbumDetail extends AlbumSummary {
  folders: AlbumFolder[];
  explicitPhotos: Photo[];
  photos: Photo[];
}

export interface AlbumMembership {
  album: AlbumSummary;
  checked: boolean;
}
