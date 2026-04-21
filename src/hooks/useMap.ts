'use client';

import { useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl';

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

export function useMap(initialCenter: MapCoordinates) {
  const mapRef = useRef<MapRef | null>(null);
  const [viewState, setViewState] = useState({
    latitude: initialCenter.latitude,
    longitude: initialCenter.longitude,
    zoom: 12
  });

  return {
    mapRef,
    viewState,
    setViewState
  };
}
