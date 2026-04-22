import { fareDefaults } from '@/lib/constants';

export interface FareInput {
  distanceKm: number;
  durationMinutes: number;
  surgeMultiplier?: number;
  baseFareCents?: number;
  perKmFareCents?: number;
  perMinuteFareCents?: number;
  platformFeeBps?: number;
}

export interface FareQuote {
  baseFareCents: number;
  perKmFareCents: number;
  perMinuteFareCents: number;
  surgeMultiplier: number;
  subtotalCents: number;
  estimatedFareCents: number;
  platformFeeCents: number;
  currency: string;
}

function clampNumber(value: number, min = 0, max = Number.POSITIVE_INFINITY) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function calculateFare(input: FareInput): FareQuote {
  const baseFareCents = input.baseFareCents ?? fareDefaults.baseFareCents;
  const perKmFareCents = input.perKmFareCents ?? fareDefaults.perKmFareCents;
  const perMinuteFareCents = input.perMinuteFareCents ?? fareDefaults.perMinuteFareCents;
  const surgeMultiplier = clampNumber(input.surgeMultiplier ?? fareDefaults.surgeMultiplier, 1, 10);
  const distanceKm = clampNumber(input.distanceKm);
  const durationMinutes = clampNumber(input.durationMinutes);

  const subtotalCents =
    baseFareCents +
    Math.round(distanceKm * perKmFareCents) +
    Math.round(durationMinutes * perMinuteFareCents);
  const estimatedFareCents = Math.max(0, Math.round(subtotalCents * surgeMultiplier));
  const platformFeeCents = input.platformFeeBps
    ? Math.max(0, Math.round((estimatedFareCents * input.platformFeeBps) / 10_000))
    : Math.round((estimatedFareCents * fareDefaults.platformFeeBps) / 10_000);

  return {
    baseFareCents,
    perKmFareCents,
    perMinuteFareCents,
    surgeMultiplier,
    subtotalCents,
    estimatedFareCents,
    platformFeeCents,
    currency: fareDefaults.currency
  };
}

export function formatMoney(cents: number, currency: string = fareDefaults.currency) {
  const amount = cents / 100;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
      .format(amount)
      .replace(/\u00a0/g, ' ');
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
