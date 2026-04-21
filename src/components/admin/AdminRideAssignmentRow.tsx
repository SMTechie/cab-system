'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2 } from 'lucide-react';
import { apiFetcher } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/fare';

interface AvailableDriver {
  user: {
    id: string;
    name: string;
  };
  profile: {
    vehicleMake: string | null;
    vehicleModel: string | null;
    plateNumber: string | null;
  };
}

export function AdminRideAssignmentRow({
  ride
}: {
  ride: {
    id: string;
    originLabel: string;
    destinationLabel: string;
    estimatedFareCents: number;
    currency: string;
    driverId: string | null;
    status: string;
  };
}) {
  const { data, mutate } = useSWR<{ drivers: AvailableDriver[] }>('/api/drivers/locations?availableOnly=true', apiFetcher);
  const [driverId, setDriverId] = useState(ride.driverId ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const assignDriver = async () => {
    if (!driverId) return;
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/rides/${ride.id}/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ driverId })
      });

      setMessage(response.ok ? 'Assigned' : 'Unable to assign');
      await mutate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-border bg-black/10 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">
            {ride.originLabel} - {ride.destinationLabel}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatMoney(ride.estimatedFareCents, ride.currency)} - {ride.status.toLowerCase()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={ride.driverId ? 'success' : 'warning'}>{ride.driverId ? 'assigned' : 'open'}</Badge>
          <select
            className="min-w-[220px] rounded-2xl border border-border bg-background/60 px-3 py-2 text-sm outline-none"
            value={driverId}
            onChange={(event) => setDriverId(event.target.value)}
          >
            <option value="">Select driver</option>
            {data?.drivers?.map((driver) => (
              <option key={driver.user.id} value={driver.user.id}>
                {driver.user.name}
                {driver.profile.plateNumber ? ` - ${driver.profile.plateNumber}` : ''}
              </option>
            ))}
          </select>
          <Button type="button" onClick={() => void assignDriver()} disabled={busy || !driverId}>
            <CheckCircle2 className="h-4 w-4" />
            {busy ? 'Assigning...' : 'Assign'}
          </Button>
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    </Card>
  );
}
