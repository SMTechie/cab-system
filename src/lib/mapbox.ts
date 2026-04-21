import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface DirectionsResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: GeoJSON.LineString;
}

function buildStraightLineRoute(origin: Coordinate, destination: Coordinate): DirectionsResult {
  const distanceKm = haversineKm(origin, destination);
  const durationMinutes = Math.max(5, Math.round((distanceKm / 35) * 60));

  return {
    distanceKm,
    durationMinutes,
    geometry: {
      type: 'LineString',
      coordinates: [
        [origin.longitude, origin.latitude],
        [destination.longitude, destination.latitude]
      ]
    }
  };
}

export function haversineKm(origin: Coordinate, destination: Coordinate) {
  const radiusKm = 6_371;
  const dLat = degreesToRadians(destination.latitude - origin.latitude);
  const dLng = degreesToRadians(destination.longitude - origin.longitude);
  const lat1 = degreesToRadians(origin.latitude);
  const lat2 = degreesToRadians(destination.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Number((2 * radiusKm * Math.asin(Math.sqrt(a))).toFixed(2));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

export async function fetchDirections(origin: Coordinate, destination: Coordinate): Promise<DirectionsResult> {
  if (!env.MAPBOX_TOKEN) {
    return buildStraightLineRoute(origin, destination);
  }

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`
  );
  url.searchParams.set('access_token', env.MAPBOX_TOKEN);
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('steps', 'false');

  const response = await fetch(url, {
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    return buildStraightLineRoute(origin, destination);
  }

  const data = (await response.json()) as {
    routes?: Array<{ distance?: number; duration?: number; geometry?: GeoJSON.LineString }>;
  };

  const route = data.routes?.[0];
  if (!route?.geometry || !route.distance || !route.duration) {
    throw new AppError('Unable to generate route', 502, 'route_unavailable');
  }

  return {
    distanceKm: Number((route.distance / 1000).toFixed(2)),
    durationMinutes: Number((route.duration / 60).toFixed(1)),
    geometry: route.geometry
  };
}

export interface PlaceSuggestion {
  id: string;
  label: string;
  placeName: string;
  latitude: number;
  longitude: number;
  relevance: number;
}

export async function searchPlaces(query: string, limit = 5): Promise<PlaceSuggestion[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  if (!env.MAPBOX_TOKEN) {
    return [];
  }

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(normalized)}.json`
  );
  url.searchParams.set('access_token', env.MAPBOX_TOKEN);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('autocomplete', 'true');
  url.searchParams.set('country', 'za');

  const response = await fetch(url, {
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    features?: Array<{
      id: string;
      place_name: string;
      text: string;
      relevance?: number;
      center?: [number, number];
    }>;
  };

  return (data.features ?? [])
    .filter((feature) => Array.isArray(feature.center) && feature.center.length === 2)
    .map((feature) => ({
      id: feature.id,
      label: feature.text,
      placeName: feature.place_name,
      latitude: feature.center?.[1] ?? 0,
      longitude: feature.center?.[0] ?? 0,
      relevance: feature.relevance ?? 0
    }));
}
