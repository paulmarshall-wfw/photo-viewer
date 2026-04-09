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
  indexedAt: string;
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

export type ActivityAction =
  | 'set_title'
  | 'set_caption'
  | 'set_date'
  | 'add_story'
  | 'edit_story'
  | 'delete_story';

export type SortField = 'date' | 'filename' | 'annotation';
export type SortOrder = 'asc' | 'desc';
export type Theme = 'light' | 'dark';

export interface AnnotationProgress {
  totalPhotos: number;
  withTitle: number;
  withCaption: number;
  withStory: number;
}
