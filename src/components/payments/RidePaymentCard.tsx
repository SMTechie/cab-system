'use client';

import { useMemo, useRef, useState } from 'react';
import { CreditCard, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/fare';
import { StripeCheckoutForm } from '@/components/payments/StripeCheckoutForm';

export function RidePaymentCard({
  rideId,
  amountCents,
  currency,
  paymentStatus
}: {
  rideId: string;
  amountCents: number;
  currency: string;
  paymentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tipAmountCents, setTipAmountCents] = useState(0);
  const idempotencyKey = useRef(crypto.randomUUID());
  const totalAmountCents = useMemo(() => amountCents + tipAmountCents, [amountCents, tipAmountCents]);

  const createPaymentIntent = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rides/${rideId}/payment-intent`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey.current
        },
        body: JSON.stringify({
          tipAmountCents
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | { data?: { clientSecret?: string | null; status?: string }; error?: { message?: string } }
        | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? 'Unable to create payment intent');
        return;
      }

      setClientSecret(payload?.data?.clientSecret ?? null);
    } finally {
      setLoading(false);
    }
  };

  if (clientSecret) {
    return (
      <StripeCheckoutForm
        rideId={rideId}
        clientSecret={clientSecret}
        amountCents={totalAmountCents}
        currency={currency}
        onPaid={() => undefined}
      />
    );
  }

  return (
    <Card className="animate-rise-up overflow-hidden rounded-[1.75rem]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Pay trip</CardTitle>
            <CardDescription>Create a payment for the completed ride.</CardDescription>
          </div>
          <Badge tone={paymentTone(paymentStatus)}>{paymentStatus.toLowerCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-3xl border border-border bg-muted/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Due</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{formatMoney(totalAmountCents, currency)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[0, 1000, 2000, 5000].map((tip) => (
              <Button
                key={tip}
                type="button"
                variant={tipAmountCents === tip ? 'primary' : 'secondary'}
                className="h-9 rounded-full px-3 text-xs"
                onClick={() => setTipAmountCents(tip)}
                disabled={Boolean(clientSecret)}
              >
                {tip === 0 ? 'No tip' : `+${formatMoney(tip, currency)}`}
              </Button>
            ))}
          </div>
        </div>

        <Button type="button" onClick={createPaymentIntent} disabled={loading}>
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {loading ? 'Creating...' : 'Create payment'}
        </Button>

        {clientSecret ? (
          <p className="text-sm text-muted-foreground">
            Payment ready for Stripe Elements.
          </p>
        ) : null}

        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
      </CardContent>
    </Card>
  );
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
