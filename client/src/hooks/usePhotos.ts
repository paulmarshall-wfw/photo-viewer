import { useQuery } from '@tanstack/react-query';
import type { PhotoDetailResponse } from '@photo-viewer/shared';

const BASE = '/api';

export function usePhotoDetail(photoId: string | null) {
  return useQuery<PhotoDetailResponse>({
    queryKey: ['photo-detail', photoId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/photos/${photoId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load photo');
      return res.json();
    },
    enabled: !!photoId,
  });
}
