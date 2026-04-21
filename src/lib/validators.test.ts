import { describe, expect, it } from 'vitest';
import { rideCreateSchema } from './validators';

describe('validators', () => {
  it('accepts a valid ride request payload', () => {
    const parsed = rideCreateSchema.safeParse({
      originLabel: 'Sandton City',
      originLatitude: -26.1076,
      originLongitude: 28.0567,
      destinationLabel: 'Rosebank Mall',
      destinationLatitude: -26.146,
      destinationLongitude: 28.0416,
      distanceKm: 12.3,
      durationMinutes: 28.5
    });

    expect(parsed.success).toBe(true);
  });
});
