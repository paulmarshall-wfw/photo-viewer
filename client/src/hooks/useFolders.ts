import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FolderContentsResponse, IndexRequest, SortField, SortOrder } from '@photo-viewer/shared';
import { api } from '../api/client.js';

const BASE = '/api';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

export function useFolderContents(
  folderPath: string,
  sort?: SortField,
  order?: SortOrder,
  page: number = 1,
) {
  const params = new URLSearchParams();
  if (sort) params.set('sort', sort);
  if (order) params.set('order', order);
  if (page > 1) params.set('page', String(page));

  const qs = params.toString();
  const url = `/folders/${folderPath}${qs ? `?${qs}` : ''}`;

  return useQuery<FolderContentsResponse>({
    queryKey: ['folder-contents', folderPath, sort, order, page],
    queryFn: () => fetchJson(url),
  });
}

export function useTriggerIndex() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request?: string | IndexRequest) => {
      const payload = typeof request === 'string' ? { folderPath: request } : request ?? {};
      return api.triggerIndex(payload);
    },
    onSuccess: () => {
      // Refetch folder contents after indexing starts
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      }, 2000);
    },
  });
}
