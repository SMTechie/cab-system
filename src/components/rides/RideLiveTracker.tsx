'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Share2, X } from 'lucide-react';
import { MapView, type MapPoint } from '@/components/maps/MapView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/fare';
import { useSocket } from '@/hooks/useSocket';

interface RideSnapshot {
  ride: {
    id: string;
    riderId: string;
    driverId: string | null;
    originLabel: string;
    originLatitude: number;
    originLongitude: number;
    destinationLabel: string;
    destinationLatitude: number;
    destinationLongitude: number;
    distanceKm: number;
    durationMinutes: number;
    estimatedFareCents: number;
    currency: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
    updatedAt: string;
    driver?: {
      id: string;
      name: string;
      email: string;
      role: string;
      createdAt: string;
      updatedAt: string;
      driverProfile?: {
        id: string;
        userId: string;
        vehicleMake: string | null;
        vehicleModel: string | null;
        plateNumber: string | null;
        stripeAccountId: string | null;
        commissionBps: number;
        isAvailable: boolean;
        createdAt: string;
        updatedAt: string;
      } | null;
    } | null;
  };
  driverLocation: {
    latitude: number;
    longitude: number;
  } | null;
}

interface DriverLocationEvent {
  driverId: string;
  rideId?: string | null;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  updatedAt: string;
}

export function RideLiveTracker({
  rideId,
  origin,
  destination,
  estimatedFareCents,
  currency,
  shareToken
}: {
  rideId: string;
  origin: { latitude: number; longitude: number; label: string };
  destination: { latitude: number; longitude: number; label: string };
  estimatedFareCents: number;
  currency: string;
  shareToken?: string | null;
}) {
  const { socket, connected, lastEvent, fallbackData } = useSocket<DriverLocationEvent, RideSnapshot>({
    eventName: 'driver:location',
    fallbackUrl: `/api/rides/${rideId}/location`,
    pollIntervalMs: 5000
  });
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const ride = fallbackData?.ride ?? null;

  useEffect(() => {
    if (!socket || !connected) return;
    socket.emit('ride:join', { rideId });
  }, [connected, rideId, socket]);

  useEffect(() => {
    if (lastEvent?.rideId && lastEvent.rideId !== rideId) return;
    if (lastEvent) {
      setDriverLocation({
        latitude: lastEvent.latitude,
        longitude: lastEvent.longitude
      });
    }
  }, [lastEvent, rideId]);

  useEffect(() => {
    setDriverLocation(
      fallbackData?.driverLocation
        ? {
            latitude: fallbackData.driverLocation.latitude,
            longitude: fallbackData.driverLocation.longitude
          }
        : null
    );
  }, [fallbackData]);

  const points: MapPoint[] = useMemo(() => {
    const driverPoint =
      driverLocation === null
        ? []
        : [
            {
              id: 'driver',
              label: 'Driver',
              tone: 'driver' as const,
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude
            }
          ];

    return [
      {
        id: 'origin',
        label: 'Pickup',
        tone: 'pickup' as const,
        latitude: origin.latitude,
        longitude: origin.longitude
      },
      {
        id: 'destination',
        label: 'Drop-off',
        tone: 'destination' as const,
        latitude: destination.latitude,
        longitude: destination.longitude
      },
      ...driverPoint
    ];
  }, [destination.latitude, destination.longitude, driverLocation, origin.latitude, origin.longitude]);

  const statusLabel =
    ride?.status === 'REQUESTED'
      ? 'Finding driver'
      : ride?.status === 'ACCEPTED'
        ? 'Driver accepted'
        : ride?.status === 'EN_ROUTE'
          ? 'Driver on the way'
          : ride?.status === 'ARRIVED'
            ? 'Driver arrived'
            : ride?.status === 'COMPLETED'
              ? 'Trip complete'
              : 'Live trip';

  const driverName = ride?.driver?.name ?? 'Waiting for driver';
  const driverVehicle = ride?.driver?.driverProfile
    ? [ride.driver.driverProfile.vehicleMake, ride.driver.driverProfile.vehicleModel].filter(Boolean).join(' ').trim()
    : null;
  const driverPlate = ride?.driver?.driverProfile?.plateNumber ?? null;

  const cancelRide = async () => {
    const response = await fetch(`/api/rides/${rideId}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ status: 'CANCELLED' })
    });

    if (response.ok) {
      window.location.reload();
    }
  };

  const copyShareLink = async () => {
    if (!shareToken || typeof window === 'undefined') return;
    await navigator.clipboard.writeText(`${window.location.origin}/share/${shareToken}`);
  };

  const jumpToSupport = () => {
    document.getElementById('support')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-4 animate-rise-up">
      <Card className="overflow-hidden rounded-[1.75rem]">
        <CardHeader className="border-b border-border/70 bg-white/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{statusLabel}</CardTitle>
              <CardDescription>{connected ? 'Live updates on' : 'Polling fallback'}</CardDescription>
            </div>
            <Badge tone={connected ? 'success' : 'warning'}>{connected ? 'live' : 'polling'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative">
            <MapView
              initialCenter={origin}
              points={points}
              route={{
                type: 'LineString',
                coordinates: [
                  [origin.longitude, origin.latitude],
                  [destination.longitude, destination.latitude]
                ]
              }}
              interactive={false}
              heightClassName="h-[22rem] sm:h-[24rem]"
            />
            <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lg">
              {ride?.status === 'REQUESTED' ? 'Driver will appear here' : 'Ride in progress'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[1.75rem]">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Driver</p>
              <p className="font-display text-xl font-semibold tracking-tight">{driverName}</p>
              {driverVehicle ? <p className="text-sm text-muted-foreground">{driverVehicle}</p> : null}
              {driverPlate ? <p className="text-sm text-muted-foreground">{driverPlate}</p> : null}
            </div>
            <Badge tone={ride?.status === 'COMPLETED' ? 'success' : ride?.status === 'CANCELLED' ? 'danger' : 'warning'}>
              {ride?.status ?? 'request'}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryTile label="Fare" value={formatMoney(estimatedFareCents, currency)} />
            <SummaryTile label="Link" value={connected ? 'Live socket' : 'Polling'} />
            <SummaryTile
              label="Driver pin"
              value={driverLocation ? `${driverLocation.latitude.toFixed(4)}, ${driverLocation.longitude.toFixed(4)}` : 'Waiting'}
            />
            <SummaryTile label="Trip" value={statusLabel} />
          </div>

          <div className="rounded-3xl border border-border bg-muted/50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Route</p>
            <div className="mt-3 space-y-2">
              <RouteRow label="Pickup" value={origin.label} />
              <RouteRow label="Drop-off" value={destination.label} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => void cancelRide()}>
              <X className="h-4 w-4" />
              Cancel ride
            </Button>
            {shareToken ? (
              <Button type="button" variant="secondary" className="flex-1" onClick={() => void copyShareLink()}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            ) : null}
            <Button type="button" className="flex-1" onClick={jumpToSupport}>
              <MessageSquare className="h-4 w-4" />
              Chat
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card px-4 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  );
}

function RouteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
