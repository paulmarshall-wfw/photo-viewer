import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PeopleTagsResponse, AllPeopleTagsResponse } from '@photo-viewer/shared';

const BASE = '/api';

export function useAllPeopleTags() {
  return useQuery<AllPeopleTagsResponse>({
    queryKey: ['people-tags', 'all'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/people-tags`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load tags');
      return res.json();
    },
  });
}

export function usePhotoTags(photoId: string | null) {
  return useQuery<PeopleTagsResponse>({
    queryKey: ['people-tags', 'photo', photoId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/photos/${photoId}/people-tags`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load photo tags');
      return res.json();
    },
    enabled: !!photoId,
  });
}

export function useAddPeopleTag(photoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${BASE}/photos/${photoId}/people-tags`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to add tag');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people-tags'] });
    },
  });
}

export function useRemovePeopleTag(photoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tagId: string) => {
      const res = await fetch(`${BASE}/photos/${photoId}/people-tags/${tagId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to remove tag');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people-tags'] });
    },
  });
}
