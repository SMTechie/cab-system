'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { BellRing, Clock3, MapPin, Route, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { apiFetcher } from '@/components/providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/fare';
import { useSocket } from '@/hooks/useSocket';

interface RideOffer {
  id: string;
  rideId: string;
  offeredFareCents: number;
  surgeMultiplier: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  ride: {
    id: string;
    originLabel: string;
    destinationLabel: string;
    distanceKm: number;
    durationMinutes: number;
    riderName: string;
  };
}

interface RideOfferResponse {
  offers: RideOffer[];
}

export function RideOfferInbox() {
  const router = useRouter();
  const [busyRideId, setBusyRideId] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR<RideOfferResponse>('/api/driver/offers', apiFetcher, {
    refreshInterval: 8000
  });

  const { lastEvent } = useSocket({
    eventName: 'ride:offer',
    enabled: true,
    onEvent: () => {
      void mutate();
    }
  });

  const offers = useMemo(() => data?.offers ?? [], [data?.offers]);

  const acceptOffer = async (rideId: string) => {
    setBusyRideId(rideId);
    try {
      const response = await fetch(`/api/rides/${rideId}/accept`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        return;
      }

      await mutate();
      router.refresh();
    } finally {
      setBusyRideId(null);
    }
  };

  const declineOffer = async (rideId: string) => {
    setBusyRideId(rideId);
    try {
      const response = await fetch(`/api/rides/${rideId}/decline`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        return;
      }

      await mutate();
      router.refresh();
    } finally {
      setBusyRideId(null);
    }
  };

  return (
    <Card className="animate-rise-up overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-white/70">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Ride offers</CardTitle>
            <CardDescription>Accept or decline nearby jobs.</CardDescription>
          </div>
          <Badge tone={offers.length > 0 ? 'warning' : 'muted'}>{offers.length > 0 ? 'new' : 'idle'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-5">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading offers...</p> : null}
        {error ? <p className="text-sm font-medium text-danger">Could not load offers.</p> : null}
        {lastEvent ? (
          <div className="rounded-3xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            New ride offer received.
          </div>
        ) : null}

        {offers.length > 0 ? (
          offers.map((offer, index) => (
            <div
              key={offer.id}
              className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 border-b border-border bg-muted/40 px-4 py-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Request {index + 1}
                  </p>
                  <p className="truncate text-base font-semibold">{offer.ride.riderName}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-semibold tracking-tight">
                    {formatMoney(offer.offeredFareCents)}
                  </p>
                  <Badge tone="muted">Offer</Badge>
                </div>
              </div>

              <div className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Pickup</p>
                    <p className="truncate text-sm font-semibold">{offer.ride.originLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{offer.ride.destinationLabel}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {offer.ride.distanceKm.toFixed(1)} km
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {offer.ride.durationMinutes.toFixed(1)} min
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Route className="h-3.5 w-3.5" />
                    x{offer.surgeMultiplier.toFixed(1)}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => void declineOffer(offer.rideId)}
                    disabled={busyRideId === offer.rideId}
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    {busyRideId === offer.rideId ? 'Working...' : 'Decline'}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => void acceptOffer(offer.rideId)}
                    disabled={busyRideId === offer.rideId}
                  >
                    <BellRing className="h-4 w-4" />
                    {busyRideId === offer.rideId ? 'Working...' : 'Accept'}
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-border bg-muted/60 p-6 text-center text-sm text-muted-foreground">
            No ride offers right now.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
