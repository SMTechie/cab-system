import { describe, expect, it } from 'vitest';
import { haversineKm } from './geo';

describe('geo', () => {
  it('calculates a positive distance', () => {
    const distance = haversineKm(
      { latitude: -26.2041, longitude: 28.0473 },
      { latitude: -26.1076, longitude: 28.0567 }
    );

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(20);
  });
});
