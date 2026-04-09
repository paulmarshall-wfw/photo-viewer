import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client.js';
import type { User } from '@photo-viewer/shared';

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setup-status'],
    queryFn: api.getSetupStatus,
    retry: false,
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth-me'],
    queryFn: api.getMe,
    retry: (count, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return count < 2;
    },
    select: (data) => data.user as User,
  });
}

export function useSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.setup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup-status'] });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.acceptInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      // Clear all cached data and force a full reload to reset app state
      queryClient.clear();
      window.location.href = '/';
    },
  });
}
