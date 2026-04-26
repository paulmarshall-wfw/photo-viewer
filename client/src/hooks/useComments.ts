import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CommentsResponse } from '@photo-viewer/shared';

const BASE = '/api';

export function useComments(photoId: string | null) {
  return useQuery<CommentsResponse>({
    queryKey: ['comments', photoId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/photos/${photoId}/comments`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load comments');
      return res.json();
    },
    enabled: !!photoId,
  });
}

export function useAddComment(photoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { body: string; parentCommentId?: string }) => {
      const res = await fetch(`${BASE}/photos/${photoId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add comment');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', photoId] });
      qc.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

export function useDeleteComment(photoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`${BASE}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete comment');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', photoId] });
      qc.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}
