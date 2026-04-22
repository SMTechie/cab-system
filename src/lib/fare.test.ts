import { describe, expect, it } from 'vitest';
import { calculateFare, formatMoney } from './fare';

describe('fare', () => {
  it('calculates fare with defaults', () => {
    const quote = calculateFare({
      distanceKm: 10,
      durationMinutes: 15
    });

    expect(quote.baseFareCents).toBeGreaterThan(0);
    expect(quote.estimatedFareCents).toBeGreaterThan(quote.baseFareCents);
    expect(quote.platformFeeCents).toBeGreaterThan(0);
    expect(quote.currency).toBe('ZAR');
  });

  it('formats South African currency', () => {
    expect(formatMoney(28_25, 'ZAR')).toBe('R 28.25');
  });
});
