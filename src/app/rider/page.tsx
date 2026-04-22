import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { LocateFixed, Route, Wallet, CarFront, ShieldAlert, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RiderAccountMenu } from '@/components/riders/RiderAccountMenu';
import { QuickActionGrid } from '@/components/layout/QuickActionGrid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OverviewStrip } from '@/components/layout/OverviewStrip';
import { RideRequestForm } from '@/components/rides/RideRequestForm';
import { RideLiveTracker } from '@/components/rides/RideLiveTracker';
import { RideSupportPanel } from '@/components/rides/RideSupportPanel';
import { RidePaymentCard } from '@/components/payments/RidePaymentCard';
import { getCurrentSession } from '@/lib/session';
import { loadRiderDashboard } from '@/lib/dashboard';
import { formatMoney } from '@/lib/fare';

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
  const showQuickActions = Boolean(activeRide || paymentRide);
  const quickActions = [
    {
      title: 'Book ride',
      subtitle: 'Start a new trip',
      icon: <CarFront className="h-5 w-5" />,
      href: '#request',
      tone: 'accent' as const
    },
    ...(activeRide
      ? [
          {
            title: 'Live ride',
            subtitle: 'Track now',
            icon: <LocateFixed className="h-5 w-5" />,
            href: '#live'
          }
        ]
      : []),
    ...(supportRide
      ? [
          {
            title: 'Support',
            subtitle: 'Chat or SOS',
            icon: <ShieldAlert className="h-5 w-5" />,
            href: '#support'
          }
        ]
      : []),
    ...(paymentRide
      ? [
          {
            title: 'Payment',
            subtitle: 'Settle fare',
            icon: <Wallet className="h-5 w-5" />,
            href: '#payment'
          }
        ]
      : []),
    {
      title: 'Profile',
      subtitle: 'Settings',
      icon: <Sparkles className="h-5 w-5" />,
      href: '/rider/profile'
    }
  ];

  return (
    <div className="cab-mobile-theme mobile-phone-shell min-h-[100svh] overflow-y-auto overscroll-y-contain text-[hsl(var(--foreground))]">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3 sm:px-4">
        <header className="mb-4 flex items-center justify-between overflow-visible rounded-[1.75rem] border border-border bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
          <RiderAccountMenu mode="dashboard" />
          <div className="flex items-center gap-2">
            <Badge tone={activeRide ? 'warning' : 'muted'}>{activeRide ? 'live' : 'ready'}</Badge>
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

          {showQuickActions ? (
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/70 bg-white/70">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Shortcuts</CardTitle>
                    <CardDescription>Jump to the parts you need now.</CardDescription>
                  </div>
                  <Badge tone="muted">Quick</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <QuickActionGrid items={quickActions} />
              </CardContent>
            </Card>
          ) : null}

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

          <section id="request">
            <RideRequestForm availableDrivers={dashboard.availableDrivers} />
          </section>
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
