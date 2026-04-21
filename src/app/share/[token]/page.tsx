import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeRide } from '@/lib/serializers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapView } from '@/components/maps/MapView';
import { formatMoney } from '@/lib/fare';

export const metadata: Metadata = {
  title: 'Shared ride'
};

export default async function SharedRidePage({ params }: { params: { token: string } }) {
  const ride = await prisma.ride.findUnique({
    where: { shareToken: params.token },
    include: {
      rider: { include: { driverProfile: true } },
      driver: { include: { driverProfile: true } },
      events: { orderBy: { createdAt: 'asc' } }
    }
  });

  if (!ride) {
    notFound();
  }

  const safeRide = serializeRide(ride);

  return (
    <div className="mx-auto min-h-screen max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Card className="animate-rise-up overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Shared trip</CardTitle>
              <CardDescription>Live ride status for family or friends.</CardDescription>
            </div>
            <Badge tone={badgeTone(safeRide.status)}>{safeRide.status.toLowerCase()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <MapView
            initialCenter={{
              latitude: safeRide.originLatitude,
              longitude: safeRide.originLongitude
            }}
            points={[
              {
                id: 'origin',
                label: 'Pickup',
                tone: 'pickup',
                latitude: safeRide.originLatitude,
                longitude: safeRide.originLongitude
              },
              {
                id: 'destination',
                label: 'Drop-off',
                tone: 'destination',
                latitude: safeRide.destinationLatitude,
                longitude: safeRide.destinationLongitude
              }
            ]}
            route={{
              type: 'LineString',
              coordinates: [
                [safeRide.originLongitude, safeRide.originLatitude],
                [safeRide.destinationLongitude, safeRide.destinationLatitude]
              ]
            }}
            interactive={false}
            heightClassName="h-[28rem]"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TripCard label="From" value={safeRide.originLabel} />
        <TripCard label="To" value={safeRide.destinationLabel} />
        <TripCard label="Fare" value={formatMoney(safeRide.estimatedFareCents, safeRide.currency)} />
        <TripCard label="Driver" value={safeRide.driver?.name ?? 'Waiting'} />
      </div>
    </div>
  );
}

function TripCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="animate-rise-up p-5">
      <CardDescription>{label}</CardDescription>
      <CardTitle className="mt-2 text-xl">{value}</CardTitle>
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
