import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactionsResponse } from '@photo-viewer/shared';

const BASE = '/api';

export function useReactions(photoId: string | null) {
  return useQuery<ReactionsResponse>({
    queryKey: ['reactions', photoId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/photos/${photoId}/reactions`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load reactions');
      return res.json();
    },
    enabled: !!photoId,
  });
}

export function useAddReaction(photoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (emoji: string) => {
      const res = await fetch(`${BASE}/photos/${photoId}/reactions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error('Failed to add reaction');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reactions', photoId] });
      qc.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

export function useRemoveReaction(photoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (emoji: string) => {
      const res = await fetch(`${BASE}/photos/${photoId}/reactions/${encodeURIComponent(emoji)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to remove reaction');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reactions', photoId] });
      qc.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}
