import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OnThisDayResponse } from '@photo-viewer/shared';

const BASE = '/api';

export function useOnThisDay() {
  return useQuery<OnThisDayResponse>({
    queryKey: ['on-this-day'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/on-this-day`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load on-this-day');
      return res.json();
    },
  });
}

export function useDismissOnThisDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/on-this-day/dismiss`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to dismiss');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['on-this-day'] });
    },
  });
}
