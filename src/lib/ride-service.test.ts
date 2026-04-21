import { describe, expect, it } from 'vitest';
import { canAccessRide, canTransitionRide } from './ride-service';

describe('ride-service', () => {
  it('allows valid transitions', () => {
    expect(canTransitionRide('REQUESTED', 'ACCEPTED')).toBe(true);
    expect(canTransitionRide('COMPLETED', 'REQUESTED')).toBe(false);
  });

  it('checks ride access by role', () => {
    const ride = {
      riderId: 'rider-1',
      driverId: 'driver-1'
    } as any;

    expect(canAccessRide('ADMIN' as any, 'admin-1', ride)).toBe(true);
    expect(canAccessRide('RIDER' as any, 'rider-1', ride)).toBe(true);
    expect(canAccessRide('DRIVER' as any, 'driver-1', ride)).toBe(true);
    expect(canAccessRide('DRIVER' as any, 'driver-2', ride)).toBe(false);
  });
});
