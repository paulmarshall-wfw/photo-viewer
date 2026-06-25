import type {
  SetupStatusResponse,
  AuthMeResponse,
  SetupRequest,
  AcceptInviteRequest,
  InviteUserRequest,
  InviteUserResponse,
  AdminConfigResponse,
  UpdateConfigRequest,
  AlbumsResponse,
  AlbumDetailResponse,
  CreateAlbumRequest,
  UpdateAlbumRequest,
  ItemAlbumMembershipResponse,
  AlbumSummary,
} from '@photo-viewer/shared';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || 'Request failed');
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Setup
export const api = {
  getSetupStatus: () => request<SetupStatusResponse>('/setup/status'),

  setup: (data: SetupRequest) =>
    request<AuthMeResponse>('/setup', { method: 'POST', body: JSON.stringify(data) }),

  // Auth
  getMe: () => request<AuthMeResponse>('/auth/me'),

  login: (email: string) =>
    request<AuthMeResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email }) }),

  acceptInvite: (data: AcceptInviteRequest) =>
    request<AuthMeResponse>('/auth/accept-invite', { method: 'POST', body: JSON.stringify(data) }),

  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST', body: '{}' }),

  // Admin
  getUsers: () => request<{ users: any[] }>('/admin/users'),

  inviteUser: (data: InviteUserRequest) =>
    request<InviteUserResponse>('/admin/users/invite', { method: 'POST', body: JSON.stringify(data) }),

  revokeUser: (id: string) =>
    request<{ success: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),

  reinviteUser: (id: string) =>
    request<InviteUserResponse>(`/admin/users/${id}/reinvite`, { method: 'POST' }),

  browseDirectories: (dirPath?: string) =>
    request<{ currentPath: string; parentPath: string | null; directories: { name: string; path: string }[]; volumes: { name: string; path: string }[] }>(
      `/browse-directories${dirPath ? `?path=${encodeURIComponent(dirPath)}` : ''}`
    ),

  getConfig: () => request<AdminConfigResponse>('/admin/config'),

  updateConfig: (data: UpdateConfigRequest) =>
    request<{ success: boolean; photosPath: string }>('/admin/config', { method: 'PUT', body: JSON.stringify(data) }),

  // Albums
  getAlbums: () => request<AlbumsResponse>('/albums'),

  createAlbum: (data: CreateAlbumRequest) =>
    request<AlbumSummary>('/albums', { method: 'POST', body: JSON.stringify(data) }),

  getAlbum: (id: string) => request<AlbumDetailResponse>(`/albums/${id}`),

  updateAlbum: (id: string, data: UpdateAlbumRequest) =>
    request<AlbumSummary>(`/albums/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteAlbum: (id: string) =>
    request<{ success: boolean }>(`/albums/${id}`, { method: 'DELETE' }),

  getAlbumMembership: (item: { photoId?: string; folderPath?: string }) => {
    const params = new URLSearchParams();
    if (item.photoId) params.set('photoId', item.photoId);
    if (item.folderPath) params.set('folderPath', item.folderPath);
    return request<ItemAlbumMembershipResponse>(`/albums/membership?${params.toString()}`);
  },

  addFolderToAlbum: (albumId: string, folderPath: string) =>
    request<{ success: boolean }>(`/albums/${albumId}/folders`, { method: 'POST', body: JSON.stringify({ folderPath }) }),

  removeFolderFromAlbum: (albumId: string, folderPath: string) =>
    request<{ success: boolean }>(`/albums/${albumId}/folders`, { method: 'DELETE', body: JSON.stringify({ folderPath }) }),

  addPhotoToAlbum: (albumId: string, photoId: string) =>
    request<{ success: boolean }>(`/albums/${albumId}/photos`, { method: 'POST', body: JSON.stringify({ photoId }) }),

  removePhotoFromAlbum: (albumId: string, photoId: string) =>
    request<{ success: boolean }>(`/albums/${albumId}/photos/${photoId}`, { method: 'DELETE' }),
};
