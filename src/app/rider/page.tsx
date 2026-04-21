import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OverviewStrip } from '@/components/layout/OverviewStrip';
import { RideRequestForm } from '@/components/rides/RideRequestForm';
import { RideLiveTracker } from '@/components/rides/RideLiveTracker';
import { RideSupportPanel } from '@/components/rides/RideSupportPanel';
import { RidePaymentCard } from '@/components/payments/RidePaymentCard';
import { getCurrentSession } from '@/lib/session';
import { loadRiderDashboard } from '@/lib/dashboard';
import { formatMoney } from '@/lib/fare';
import { LocateFixed, Route, Wallet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Rider dashboard'
};

export default async function RiderPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  if (session.role !== UserRole.RIDER && session.role !== UserRole.ADMIN) redirect(session.role === UserRole.DRIVER ? '/driver' : '/');

  const dashboard = await loadRiderDashboard(session.userId);
  const activeRide = dashboard.rides.find((ride) => ride.status !== 'COMPLETED' && ride.status !== 'CANCELLED');
  const paymentRide = dashboard.rides.find((ride) => ride.status === 'COMPLETED' && ride.paymentStatus !== 'PAID');
  const supportRide = activeRide ?? paymentRide;

  return (
    <div className="cab-mobile-theme mobile-phone-shell min-h-[100svh] overflow-y-auto overscroll-y-contain text-[hsl(var(--foreground))]">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3 sm:px-4">
        <header className="mb-4 flex items-center justify-between rounded-[1.75rem] border border-border bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-lg font-bold">
              C
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">CabFlow Rider</p>
              <p className="font-display text-lg font-semibold tracking-tight">Where to?</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/rider/profile"
              className="inline-flex h-10 items-center rounded-full border border-border bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:bg-muted/60"
            >
              Profile
            </Link>
            <Badge tone={activeRide ? 'warning' : 'muted'}>{activeRide ? 'live' : 'ready'}</Badge>
            <LogoutButton />
          </div>
        </header>

        <div className="space-y-4">
          <OverviewStrip
            items={[
              {
                label: 'Status',
                value: activeRide ? 'Live' : 'Ready',
                detail: activeRide ? 'Ride in progress' : 'Book when ready',
                icon: <LocateFixed className="h-4 w-4" />,
                tone: activeRide ? 'warning' : 'success'
              },
              {
                label: 'Trips',
                value: `${dashboard.completedTrips}`,
                detail: `${dashboard.upcomingTrips} upcoming`,
                icon: <Route className="h-4 w-4" />
              },
              {
                label: 'Spend',
                value: formatMoney(dashboard.spentCents, 'ZAR'),
                detail: 'Paid rides',
                icon: <Wallet className="h-4 w-4" />
              }
            ]}
          />

          <section id="request">
            <RideRequestForm availableDrivers={dashboard.availableDrivers} />
          </section>

          {activeRide ? (
            <Card id="live" className="animate-rise-up overflow-hidden">
              <CardHeader className="border-b border-border/70 bg-white/70">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Live ride</CardTitle>
                    <CardDescription>Track the trip.</CardDescription>
                  </div>
                  <Badge tone={badgeTone(activeRide.status)}>{activeRide.status.toLowerCase()}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <RideLiveTracker
                  rideId={activeRide.id}
                  origin={{
                    latitude: activeRide.originLatitude,
                    longitude: activeRide.originLongitude,
                    label: activeRide.originLabel
                  }}
                  destination={{
                    latitude: activeRide.destinationLatitude,
                    longitude: activeRide.destinationLongitude,
                    label: activeRide.destinationLabel
                  }}
                  estimatedFareCents={activeRide.estimatedFareCents}
                  currency={activeRide.currency}
                  shareToken={activeRide.shareToken}
                />
              </CardContent>
            </Card>
          ) : null}

          {supportRide ? (
            <section id="support" className="scroll-mt-28">
              <RideSupportPanel rideId={supportRide.id} shareToken={supportRide.shareToken} />
            </section>
          ) : null}

          {paymentRide ? (
            <section id="payment">
              <RidePaymentCard
                rideId={paymentRide.id}
                amountCents={paymentRide.estimatedFareCents}
                currency={paymentRide.currency}
                paymentStatus={paymentRide.paymentStatus}
              />
            </section>
          ) : null}

        </div>
      </div>
    </div>
  );
}

function badgeTone(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
    case 'ACCEPTED':
    case 'EN_ROUTE':
    case 'ARRIVED':
      return 'warning';
    default:
      return 'muted';
  }
}
