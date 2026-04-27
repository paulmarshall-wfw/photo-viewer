import type {
  User,
  Folder,
  Photo,
  StoryEntry,
  ActivityEntry,
  AnnotationProgress,
  SortField,
  SortOrder,
  PeopleTag,
  Reaction,
  Comment,
  Notification,
  OnThisDayPhoto,
} from './types.js';

// Setup
export interface SetupRequest {
  // Optional when the server has a SETUP_LIBRARY_PATH env var set
  // (launcher-managed deployments where the host folder is bind-mounted).
  photosPath?: string;
  displayName: string;
  email: string;
}

export interface SetupStatusResponse {
  needsSetup: boolean;
  // When set, the server has been launched with a pre-bound library path
  // (e.g. AppLauncher bind-mount). The client should hide the folder picker.
  setupLibraryPath?: string | null;
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
  personTag?: string;
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

// Reactions
export interface AddReactionRequest {
  emoji: string;
}

export interface ReactionsResponse {
  reactions: Reaction[];
}

// Comments
export interface AddCommentRequest {
  body: string;
  parentCommentId?: string;
}

export interface CommentsResponse {
  comments: Comment[];
}

// People tags
export interface AddPeopleTagRequest {
  name: string;
}

export interface PeopleTagsResponse {
  tags: PeopleTag[];
}

export interface AllPeopleTagsResponse {
  tags: PeopleTag[];
}

// Location
export interface UpdateLocationRequest {
  location: string;
}

// Follows
export interface FollowStatusResponse {
  following: boolean;
}

// Notifications
export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

// On This Day
export interface OnThisDayResponse {
  photos: OnThisDayPhoto[];
  dismissed: boolean;
}
