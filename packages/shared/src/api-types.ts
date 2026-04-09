import type {
  User,
  Folder,
  Photo,
  StoryEntry,
  ActivityEntry,
  AnnotationProgress,
  SortField,
  SortOrder,
} from './types.js';

// Setup
export interface SetupRequest {
  photosPath: string;
  displayName: string;
  email: string;
}

export interface SetupStatusResponse {
  needsSetup: boolean;
}

// Auth
export interface AcceptInviteRequest {
  token: string;
  displayName: string;
}

export interface AuthMeResponse {
  user: User;
}

// Admin
export interface InviteUserRequest {
  email: string;
}

export interface InviteUserResponse {
  inviteUrl: string;
  token: string;
}

export interface AdminConfigResponse {
  photosPath: string;
}

export interface UpdateConfigRequest {
  photosPath: string;
}

// Folders & Photos
export interface FolderContentsResponse {
  folder: Folder | null;
  subfolders: Folder[];
  photos: Photo[];
  totalPhotos: number;
  page: number;
  limit: number;
  breadcrumbs: { name: string; path: string }[];
}

export interface FolderContentsQuery {
  sort?: SortField;
  order?: SortOrder;
  page?: number;
  limit?: number;
}

export interface PhotoDetailResponse {
  photo: Photo;
  story: StoryEntry[];
}

// Metadata
export interface UpdateTitleRequest {
  title: string;
}

export interface UpdateCaptionRequest {
  caption: string;
}

export interface UpdateDateRequest {
  dateTaken: string;
}

export interface AddStoryRequest {
  content: string;
}

export interface EditStoryRequest {
  content: string;
}

// Search
export interface SearchQuery {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  hasTitle?: boolean;
  needsTitle?: boolean;
  hasCaption?: boolean;
  needsCaption?: boolean;
  hasStory?: boolean;
  needsStory?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchResponse {
  results: (Photo & { folderName: string })[];
  total: number;
  page: number;
  limit: number;
}

// Activity
export interface ActivityResponse {
  entries: ActivityEntry[];
  total: number;
  page: number;
  limit: number;
}

// Stats
export interface StatsResponse {
  global: AnnotationProgress;
  folder?: AnnotationProgress;
}
