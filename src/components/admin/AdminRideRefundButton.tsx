'use client';

import { useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminRideRefundButton({ rideId }: { rideId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());

  const refund = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/rides/${rideId}/refund`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'idempotency-key': idempotencyKey.current
        }
      });

      setMessage(response.ok ? 'Refunded' : 'Unable to refund');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="secondary" onClick={() => void refund()} disabled={busy}>
        <RotateCcw className="h-4 w-4" />
        {busy ? 'Refunding...' : 'Refund'}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
