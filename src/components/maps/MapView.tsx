'use client';

import { useEffect, useMemo, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Map, { Layer, Marker, NavigationControl, Source } from 'react-map-gl';
import type { MapLayerMouseEvent } from 'react-map-gl';
import { MapPin } from 'lucide-react';
import { useMap } from '@/hooks/useMap';
import type { MapCoordinates } from '@/hooks/useMap';
import { useMapboxToken } from '@/components/providers';

export interface MapPoint extends MapCoordinates {
  id: string;
  label: string;
  tone?: 'pickup' | 'destination' | 'driver' | 'neutral';
}

export interface MapViewProps {
  initialCenter: MapCoordinates;
  points: MapPoint[];
  route?: GeoJSON.LineString | null;
  className?: string;
  heightClassName?: string;
  onMapClick?: (coordinates: MapCoordinates) => void;
  interactive?: boolean;
  mapboxAccessToken?: string | null;
}

const routeLayer = {
  id: 'route-line',
  type: 'line',
  paint: {
    'line-color': '#12c2b9',
    'line-width': 4,
    'line-opacity': 0.92
  }
} as const;

const toneStyles: Record<NonNullable<MapPoint['tone']>, string> = {
  pickup: 'bg-primary text-primary-foreground',
  destination: 'bg-accent text-accent-foreground',
  driver: 'bg-success text-white',
  neutral: 'bg-white text-slate-900'
};

export function MapView({
  initialCenter,
  points,
  route,
  className,
  heightClassName = 'h-[26rem]',
  onMapClick,
  interactive = true,
  mapboxAccessToken
}: MapViewProps) {
  const { mapRef, viewState, setViewState } = useMap(initialCenter);
  const [mapLoaded, setMapLoaded] = useState(false);
  const contextToken = useMapboxToken();
  const token = mapboxAccessToken ?? contextToken;

  const routeData = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString> | null>(() => {
    if (!route) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: route
        }
      ]
    };
  }, [route]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || points.length === 0) return;

    if (points.length === 1) {
      const [point] = points;
      mapRef.current.flyTo({
        center: [point.longitude, point.latitude],
        zoom: 13,
        duration: 600
      });
      return;
    }

    const bounds = new mapboxgl.LngLatBounds(
      [points[0].longitude, points[0].latitude],
      [points[0].longitude, points[0].latitude]
    );

    for (const point of points) {
      bounds.extend([point.longitude, point.latitude]);
    }

    mapRef.current.fitBounds(bounds, {
      padding: 64,
      duration: 700,
      maxZoom: 15
    });
  }, [mapLoaded, mapRef, points]);

  if (!token) {
    return (
      <div className={`surface relative overflow-hidden ${heightClassName} ${className ?? ''}`}>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#f8fafc_0%,#eef4fb_100%)]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.16),transparent_26%),radial-gradient(circle_at_80%_30%,rgba(18,194,185,0.12),transparent_22%),linear-gradient(135deg,transparent_0%,transparent_47%,rgba(148,163,184,0.18)_48%,transparent_49%,transparent_100%)] bg-[length:100%_100%,100%_100%,24px_24px]" />
        <div className="relative z-10 flex h-full items-center justify-center p-6">
          <div className="max-w-md space-y-3 text-center">
            <MapPin className="mx-auto h-6 w-6 text-primary" />
            <p className="font-display text-lg font-semibold">Map preview unavailable</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> or <code>MAPBOX_TOKEN</code> to enable the live map.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`surface overflow-hidden ${heightClassName} ${className ?? ''}`}>
      <Map
        ref={mapRef}
        {...viewState}
        mapboxAccessToken={token}
        onLoad={() => setMapLoaded(true)}
        onMove={(event) => setViewState(event.viewState)}
        onClick={(event: MapLayerMouseEvent) => {
          if (!interactive) return;
          onMapClick?.({
            latitude: event.lngLat.lat,
            longitude: event.lngLat.lng
          });
        }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        {routeData ? (
          <Source id="route-source" type="geojson" data={routeData}>
            <Layer {...routeLayer} />
          </Source>
        ) : null}

        {points.map((point) => (
          <Marker key={point.id} latitude={point.latitude} longitude={point.longitude} anchor="bottom">
            <div className="group flex flex-col items-center gap-2">
              <div className={`rounded-full px-3 py-1 text-xs font-semibold shadow-lg ${toneStyles[point.tone ?? 'neutral']}`}>
                {point.label}
              </div>
              <div className={`h-4 w-4 rotate-45 rounded-[6px] ${point.tone === 'destination' ? 'bg-accent' : point.tone === 'driver' ? 'bg-success' : 'bg-primary'}`} />
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
