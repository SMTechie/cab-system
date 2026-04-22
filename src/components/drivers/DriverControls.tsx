'use client';

import { useState, type ReactNode } from 'react';
import { Building2, CheckCircle2, RadioTower, Wallet, Route, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapView, type MapPoint } from '@/components/maps/MapView';
import { formatMoney } from '@/lib/fare';

export function DriverControls({
  isAvailable,
  stripeAccountId,
  currentLocation,
  completedTrips,
  earningPotentialCents
}: {
  isAvailable: boolean;
  stripeAccountId: string | null;
  currentLocation: { latitude: number; longitude: number; updatedAt: string } | null;
  completedTrips: number;
  earningPotentialCents: number;
}) {
  const [payoutPending, setPayoutPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const points: MapPoint[] = currentLocation
    ? [
        {
          id: 'driver-location',
          label: 'You',
          tone: 'driver',
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        }
      ]
    : [];

  const onboardStripe = async () => {
    setPayoutPending(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        credentials: 'include'
      });

      const payload = (await response.json().catch(() => null)) as { data?: { url?: string }; error?: { message?: string } } | null;
      if (!response.ok) {
        setStatusMessage(payload?.error?.message ?? 'Unable to start Stripe onboarding');
        return;
      }

      if (payload?.data?.url) {
        window.location.href = payload.data.url;
        return;
      }

      setStatusMessage('Unable to open the Stripe onboarding link.');
    } catch {
      setStatusMessage('Unable to start Stripe onboarding');
    } finally {
      setPayoutPending(false);
    }
  };

  return (
    <Card className="animate-rise-up overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-white/70">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Shift</CardTitle>
            <CardDescription>Check your location and manage payout.</CardDescription>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${isAvailable ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
            {isAvailable ? 'online' : 'offline'}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="overflow-hidden rounded-[1.75rem] border border-border bg-muted/40">
          <MapView
            initialCenter={
              currentLocation
                ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
                : { latitude: -26.2041, longitude: 28.0473 }
            }
            points={points}
            interactive={false}
            heightClassName="h-[18rem]"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Trips" value={`${completedTrips}`} icon={<Route className="h-4 w-4" />} />
          <Stat label="Today" value={formatMoney(earningPotentialCents)} icon={<Coins className="h-4 w-4" />} />
          <Stat
            label="Payout"
            value={stripeAccountId ? 'Ready' : 'Connect'}
            icon={<Building2 className="h-4 w-4" />}
          />
        </div>

        <div id="payout" className="rounded-3xl border border-border bg-muted/50 px-4 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Payout</p>
              <p className="text-sm text-muted-foreground">
                {stripeAccountId ? 'Stripe Connect is ready.' : 'Connect Stripe to receive payouts.'}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={onboardStripe} disabled={payoutPending} className="mt-4 w-full">
            <Wallet className="h-4 w-4" />
            {stripeAccountId ? 'Refresh link' : 'Connect payout'}
          </Button>
          {statusMessage ? <p className="mt-3 text-sm text-danger">{statusMessage}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">{label}</p>
        {icon}
      </div>
      <p className="mt-2 font-display text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}
