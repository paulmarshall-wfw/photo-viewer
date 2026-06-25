import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { AlbumVisibility } from '@photo-viewer/shared';

type AlbumItem = { photoId?: string; folderPath?: string };

function membershipKey(item: AlbumItem) {
  return ['album-membership', item.photoId ?? null, item.folderPath ?? null] as const;
}

function invalidateAlbumData(queryClient: ReturnType<typeof useQueryClient>, item?: AlbumItem, albumId?: string) {
  queryClient.invalidateQueries({ queryKey: ['albums'] });
  if (albumId) queryClient.invalidateQueries({ queryKey: ['album', albumId] });
  if (item) queryClient.invalidateQueries({ queryKey: membershipKey(item) });
}

export function useAlbums() {
  return useQuery({
    queryKey: ['albums'],
    queryFn: api.getAlbums,
    select: (data) => data.albums,
  });
}

export function useAlbum(albumId: string | undefined) {
  return useQuery({
    queryKey: ['album', albumId],
    queryFn: () => api.getAlbum(albumId!),
    enabled: !!albumId,
    select: (data) => data.album,
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; visibility?: AlbumVisibility }) => api.createAlbum(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
  });
}

export function useUpdateAlbum(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; visibility?: AlbumVisibility }) => api.updateAlbum(albumId, data),
    onSuccess: () => invalidateAlbumData(queryClient, undefined, albumId),
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (albumId: string) => api.deleteAlbum(albumId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
  });
}

export function useRemoveAlbumPhoto(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => api.removePhotoFromAlbum(albumId, photoId),
    onSuccess: async (_data, photoId) => {
      invalidateAlbumData(queryClient, { photoId }, albumId);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['albums'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['album', albumId], type: 'active' }),
      ]);
    },
  });
}

export function useAlbumMembership(item: AlbumItem, enabled: boolean) {
  return useQuery({
    queryKey: membershipKey(item),
    queryFn: () => api.getAlbumMembership(item),
    enabled,
    select: (data) => data.albums,
  });
}

export function useSetFolderAlbumMembership(folderPath: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ albumId, checked }: { albumId: string; checked: boolean }) =>
      checked ? api.addFolderToAlbum(albumId, folderPath) : api.removeFolderFromAlbum(albumId, folderPath),
    onSuccess: (_data, variables) => {
      invalidateAlbumData(queryClient, { folderPath }, variables.albumId);
    },
  });
}

export function useSetPhotoAlbumMembership(photoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ albumId, checked }: { albumId: string; checked: boolean }) =>
      checked ? api.addPhotoToAlbum(albumId, photoId) : api.removePhotoFromAlbum(albumId, photoId),
    onSuccess: (_data, variables) => {
      invalidateAlbumData(queryClient, { photoId }, variables.albumId);
    },
  });
}
