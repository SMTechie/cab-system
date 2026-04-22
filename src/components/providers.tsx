'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';

const MapboxTokenContext = createContext<string | null>(null);

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

export function Providers({ children, mapboxToken }: { children: ReactNode; mapboxToken?: string | null }) {
  const swrValue = useMemo(
    () => ({
      fetcher: apiFetcher,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      keepPreviousData: true
    }),
    []
  );

  const mapboxValue = useMemo(() => mapboxToken ?? null, [mapboxToken]);

  return (
    <MapboxTokenContext.Provider value={mapboxValue}>
      <NotificationProvider>
        <SWRConfig value={swrValue}>{children}</SWRConfig>
      </NotificationProvider>
    </MapboxTokenContext.Provider>
  );
}

export function useMapboxToken() {
  return useContext(MapboxTokenContext);
}
