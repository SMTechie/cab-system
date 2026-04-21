'use client';

import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';

export async function apiFetcher<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      accept: 'application/json'
    }
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: unknown; error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Request failed with status ${response.status}`);
  }

  return (payload?.data ?? payload) as T;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: apiFetcher,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        keepPreviousData: true
      }}
    >
      {children}
    </SWRConfig>
  );
}
