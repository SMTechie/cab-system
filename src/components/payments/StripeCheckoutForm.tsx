'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/fare';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export function StripeCheckoutForm({
  rideId,
  clientSecret,
  amountCents,
  currency,
  onPaid
}: {
  rideId: string;
  clientSecret: string;
  amountCents: number;
  currency: string;
  onPaid: () => void;
}) {
  const options = useMemo<StripeElementsOptions>(
    () => ({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#eab308',
          colorBackground: '#ffffff',
          colorText: '#0f172a',
          colorDanger: '#dc2626',
          borderRadius: '16px'
        }
      }
    }),
    [clientSecret]
  );

  if (!stripePromise) {
    return (
      <Card className="animate-rise-up overflow-hidden rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Checkout not ready</CardTitle>
          <CardDescription>Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable card payments.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm
        rideId={rideId}
        clientSecret={clientSecret}
        amountCents={amountCents}
        currency={currency}
        onPaid={onPaid}
      />
    </Elements>
  );
}

function CheckoutForm({
  rideId,
  clientSecret,
  amountCents,
  currency,
  onPaid
}: {
  rideId: string;
  clientSecret: string;
  amountCents: number;
  currency: string;
  onPaid: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ paymentIntentId: string; amount: string } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!stripe || !elements) {
        setError('Stripe is still loading.');
        return;
      }

      const card = elements.getElement(CardElement);
      if (!card) {
        setError('Card form is not ready.');
        return;
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card
        }
      });

      if (result.error) {
        setError(result.error.message ?? 'Payment failed');
        return;
      }

      if (result.paymentIntent?.status === 'succeeded') {
        setReceipt({
          paymentIntentId: result.paymentIntent.id,
          amount: formatMoney(amountCents, currency)
        });
        onPaid();
      }
    } finally {
      setLoading(false);
    }
  };

  if (receipt) {
    return (
      <Card className="animate-rise-up overflow-hidden rounded-[1.75rem]">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Paid</CardTitle>
              <CardDescription>Your receipt is ready.</CardDescription>
            </div>
            <Badge tone="success">done</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-3xl border border-border bg-muted/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Amount</p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{receipt.amount}</p>
            <p className="mt-2 text-xs text-muted-foreground">Payment ID: {receipt.paymentIntentId}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={`/api/rides/${rideId}/invoice`} target="_blank" rel="noreferrer">
                Download invoice
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-rise-up overflow-hidden rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>Pay now</CardTitle>
        <CardDescription>Card payment with Stripe Elements.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-3xl border border-border bg-muted/40 p-4">
            <CardElement options={cardOptions} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{formatMoney(amountCents, currency)}</p>
            <Button type="submit" disabled={loading || !stripe || !elements}>
              {loading ? 'Processing...' : 'Pay'}
            </Button>
          </div>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}

const cardOptions = {
  style: {
    base: {
      color: '#0f172a',
      fontFamily: 'Manrope, sans-serif',
      fontSize: '16px',
      '::placeholder': {
        color: '#64748b'
      }
    },
    invalid: {
      color: '#dc2626'
    }
  },
  hidePostalCode: true
};
