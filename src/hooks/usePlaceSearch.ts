'use client';

import useSWR from 'swr';
import { apiFetcher } from '@/components/providers';

export interface PlaceSuggestion {
  id: string;
  label: string;
  placeName: string;
  latitude: number;
  longitude: number;
  relevance: number;
}

export function usePlaceSearch(query: string) {
  const trimmed = query.trim();
  const key =
    trimmed.length >= 3 && trimmed.toLowerCase() !== 'pickup' && trimmed.toLowerCase() !== 'drop-off'
      ? `/api/maps/geocode?q=${encodeURIComponent(trimmed)}&limit=6`
      : null;
  const { data, error, isLoading, mutate } = useSWR<{ places: PlaceSuggestion[] }>(key, apiFetcher, {
    keepPreviousData: true
  });

  return {
    places: data?.places ?? [],
    isLoading,
    error,
    refreshPlaces: mutate
  };
}
