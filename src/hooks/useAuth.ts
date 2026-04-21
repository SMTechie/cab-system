'use client';

import useSWR from 'swr';
import { apiFetcher } from '@/components/providers';
import type { SessionUser } from '@/lib/session';

export interface AuthResponse {
  user: SessionUser | null;
}

export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR<AuthResponse>('/api/auth/me', apiFetcher);

  return {
    user: data?.user ?? null,
    isLoading,
    error,
    refreshAuth: mutate
  };
}
