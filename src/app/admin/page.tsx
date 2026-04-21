import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminRideAssignmentRow } from '@/components/admin/AdminRideAssignmentRow';
import { AdminRideRefundButton } from '@/components/admin/AdminRideRefundButton';
import { getCurrentSession } from '@/lib/session';
import { loadAdminDashboard } from '@/lib/dashboard';
import { formatMoney } from '@/lib/fare';

export const metadata: Metadata = {
  title: 'Admin dashboard'
};

export default async function AdminPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  if (session.role !== UserRole.ADMIN) redirect(session.role === UserRole.DRIVER ? '/driver' : '/rider');

  const dashboard = await loadAdminDashboard();
  const queuedRides = dashboard.recentRides.filter((ride) => ride.status === 'REQUESTED' && !ride.driverId);

  return (
    <AppShell user={session} title="Admin dashboard" subtitle="Fleet view, live trips, and settlement status.">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-rise-up">
          <MetricCard label="Rides" value={`${dashboard.totalRides}`} />
          <MetricCard label="Active" value={`${dashboard.activeRides}`} />
          <MetricCard label="Revenue" value={formatMoney(dashboard.totalRevenueCents)} />
          <MetricCard label="Queue" value={`${dashboard.queuedDispatches}`} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-rise-up">
          <MetricCard label="Drivers" value={`${dashboard.driversOnline}`} />
          <MetricCard label="Riders" value={`${dashboard.riders}`} />
          <MetricCard label="Fees" value={formatMoney(dashboard.platformFeesCents)} />
          <MetricCard label="Alerts" value={`${dashboard.openSafetyAlerts}`} />
        </div>

        <Card className="animate-rise-up">
          <CardHeader>
            <CardTitle>Dispatch queue</CardTitle>
            <CardDescription>Assign open rides to the nearest driver.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {queuedRides.length ? (
              queuedRides.map((ride) => (
                <AdminRideAssignmentRow
                  key={ride.id}
                  ride={{
                    id: ride.id,
                    originLabel: ride.originLabel,
                    destinationLabel: ride.destinationLabel,
                    estimatedFareCents: ride.estimatedFareCents,
                    currency: ride.currency,
                    driverId: ride.driverId,
                    status: ride.status
                  }}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No open rides right now.</p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-rise-up">
          <CardHeader>
            <CardTitle>Safety alerts</CardTitle>
            <CardDescription>Active SOS and rider reports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentAlerts.length ? (
              dashboard.recentAlerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-border bg-black/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{alert.type}</p>
                    <Badge tone={alert.status === 'RESOLVED' ? 'success' : 'warning'}>{alert.status.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{alert.message}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No open alerts.</p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-rise-up">
          <CardHeader>
            <CardTitle>Pending documents</CardTitle>
            <CardDescription>Driver verification uploads waiting review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.pendingDriverDocuments.length ? (
              dashboard.pendingDriverDocuments.map((document) => (
                <div key={document.id} className="rounded-2xl border border-border bg-black/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{document.title ?? document.type}</p>
                    <Badge tone="warning">{document.status.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{document.filePath}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No documents waiting review.</p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-rise-up">
          <CardHeader>
            <CardTitle>Recent rides</CardTitle>
            <CardDescription>Latest trip states and payments.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentRides.map((ride) => (
                <div
                  key={ride.id}
                  className="grid gap-3 rounded-2xl border border-border bg-black/10 p-4 transition hover:-translate-y-0.5 hover:border-primary/30 lg:grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr_auto]"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {ride.originLabel} - {ride.destinationLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ride.distanceKm.toFixed(2)} km / {ride.durationMinutes.toFixed(1)} min / {formatMoney(ride.estimatedFareCents, ride.currency)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Badge tone={badgeTone(ride.status)}>{ride.status.toLowerCase()}</Badge>
                  </div>
                  <div className="flex items-center">
                    <Badge tone={paymentTone(ride.paymentStatus)}>{ride.paymentStatus.toLowerCase()}</Badge>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    {ride.driverId ?? 'Unassigned'}
                  </div>
                  <div className="flex items-center justify-start lg:justify-end">
                    {ride.paymentStatus === 'PAID' ? <AdminRideRefundButton rideId={ride.id} /> : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="animate-rise-up p-5">
      <CardDescription className="mt-0">{label}</CardDescription>
      <CardTitle className="mt-2 text-3xl">{value}</CardTitle>
    </Card>
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
