import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FollowStatusResponse } from '@photo-viewer/shared';

const BASE = '/api';

export function useFollowStatus(photoId: string | null) {
  return useQuery<FollowStatusResponse>({
    queryKey: ['follow', photoId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/photos/${photoId}/follow`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load follow status');
      return res.json();
    },
    enabled: !!photoId,
  });
}

export function useToggleFollow(photoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (follow: boolean) => {
      const res = await fetch(`${BASE}/photos/${photoId}/follow`, {
        method: follow ? 'POST' : 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to toggle follow');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follow', photoId] });
    },
  });
}
