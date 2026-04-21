import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OverviewStrip } from '@/components/layout/OverviewStrip';
import { QuickActionGrid } from '@/components/layout/QuickActionGrid';
import { DriverControls } from '@/components/drivers/DriverControls';
import { RideOfferInbox } from '@/components/drivers/RideOfferInbox';
import { DriverDocumentManager } from '@/components/drivers/DriverDocumentManager';
import { DriverLocationSync } from '@/components/drivers/DriverLocationSync';
import { RideLiveTracker } from '@/components/rides/RideLiveTracker';
import { getCurrentSession } from '@/lib/session';
import { loadDriverDashboard } from '@/lib/dashboard';
import { formatMoney } from '@/lib/fare';
import { BellRing, FileText, RadioTower, Route, Sparkles, UserRound, Wallet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Driver dashboard'
};

export default async function DriverPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  if (session.role !== UserRole.DRIVER && session.role !== UserRole.ADMIN) redirect(session.role === UserRole.RIDER ? '/rider' : '/');

  const dashboard = await loadDriverDashboard(session.userId);
  const activeRide = dashboard.rides.find((ride) => ride.status !== 'COMPLETED' && ride.status !== 'CANCELLED');
  const available = dashboard.profile?.isAvailable ?? false;
  const pendingOffers = dashboard.pendingOffers.length;

  return (
    <div className="cab-mobile-theme mobile-phone-shell min-h-[100svh] overflow-y-auto overscroll-y-contain text-[hsl(var(--foreground))]">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3 sm:px-4">
        <header className="mb-4 flex items-center justify-between rounded-[1.75rem] border border-border bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-lg font-bold">
              C
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">CabFlow Driver</p>
              <p className="font-display text-lg font-semibold tracking-tight">Ready to earn</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/driver/profile"
              className="inline-flex h-10 items-center rounded-full border border-border bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:bg-muted/60"
            >
              Profile
            </Link>
            <Badge tone={available ? 'success' : 'muted'}>
              {available ? 'online' : 'offline'}
            </Badge>
            <LogoutButton />
          </div>
        </header>

        <div className="space-y-4">
          <OverviewStrip
            items={[
              {
                label: 'Status',
                value: available ? 'Online' : 'Offline',
                detail: available ? 'Visible to riders' : 'Tap to start shift',
                icon: <RadioTower className="h-4 w-4" />,
                tone: available ? 'success' : 'muted'
              },
              {
                label: 'Offers',
                value: `${pendingOffers}`,
                detail: pendingOffers > 0 ? 'Needs action' : 'Nothing queued',
                icon: <BellRing className="h-4 w-4" />,
                tone: pendingOffers > 0 ? 'warning' : 'default'
              },
              {
                label: 'Earnings',
                value: formatMoney(dashboard.earningPotentialCents, 'ZAR'),
                detail: dashboard.profile?.stripeAccountId ? 'Payout ready' : 'Connect payout',
                icon: <Wallet className="h-4 w-4" />,
                tone: dashboard.profile?.stripeAccountId ? 'success' : 'warning'
              }
            ]}
          />

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/70 bg-white/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Shortcuts</CardTitle>
                  <CardDescription>Profile, shift, requests, documents, and payout.</CardDescription>
                </div>
                <Badge tone="muted">Quick</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <QuickActionGrid
                items={[
                  {
                    title: 'Profile',
                    subtitle: 'Edit driver info',
                    icon: <UserRound className="h-5 w-5" />,
                    href: '/driver/profile'
                  },
                  {
                    title: 'Shift',
                    subtitle: 'Go online fast',
                    icon: <RadioTower className="h-5 w-5" />,
                    href: '#availability'
                  },
                  {
                    title: 'Requests',
                    subtitle: 'New ride offers',
                    icon: <BellRing className="h-5 w-5" />,
                    href: '#offers'
                  },
                  {
                    title: 'Documents',
                    subtitle: 'Upload files',
                    icon: <FileText className="h-5 w-5" />,
                    href: '#documents'
                  },
                  {
                    title: 'Live trip',
                    subtitle: 'Track active ride',
                    icon: <Route className="h-5 w-5" />,
                    href: '#live'
                  },
                  {
                    title: 'Payout',
                    subtitle: 'Stripe Connect',
                    icon: <Sparkles className="h-5 w-5" />,
                    href: '#payout'
                  }
                ]}
              />
            </CardContent>
          </Card>

          <section id="availability">
            <DriverControls
              isAvailable={dashboard.profile?.isAvailable ?? false}
              stripeAccountId={dashboard.profile?.stripeAccountId ?? null}
              currentLocation={dashboard.location}
              completedTrips={dashboard.completedTrips}
              earningPotentialCents={dashboard.earningPotentialCents}
            />
          </section>

          <section id="offers">
            <RideOfferInbox />
          </section>

          <DriverLocationSync rideId={activeRide?.id ?? null} />

          {activeRide ? (
            <Card id="live" className="animate-rise-up overflow-hidden">
              <CardHeader className="border-b border-border/70 bg-white/70">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Active ride</CardTitle>
                    <CardDescription>Keep the trip moving.</CardDescription>
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
                />
              </CardContent>
            </Card>
          ) : null}

          <section id="documents">
            <DriverDocumentManager />
          </section>

          <Card className="animate-rise-up">
            <CardHeader>
              <CardTitle>Recent trips</CardTitle>
              <CardDescription>{dashboard.completedTrips} completed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard.rides.slice(0, 6).map((ride) => (
                  <div
                    key={ride.id}
                    className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-muted/50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {ride.originLabel} to {ride.destinationLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ride.distanceKm.toFixed(1)} km - {formatMoney(ride.estimatedFareCents, ride.currency)}
                      </p>
                    </div>
                    <Badge tone={paymentTone(ride.paymentStatus)}>{ride.paymentStatus.toLowerCase()}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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

function paymentTone(status: string) {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'REFUNDED':
      return 'muted';
    case 'FAILED':
      return 'danger';
    case 'PROCESSING':
    case 'REQUIRES_PAYMENT_METHOD':
      return 'warning';
    default:
      return 'muted';
  }
}
