export const sessionCookieName = 'cab_session';

export const rideStatusOrder = ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED'] as const;

export const paymentStatusValues = ['UNPAID', 'REQUIRES_PAYMENT_METHOD', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED'] as const;

export const roleValues = ['RIDER', 'DRIVER', 'ADMIN'] as const;

export const fareDefaults = {
  baseFareCents: 350,
  perKmFareCents: 180,
  perMinuteFareCents: 45,
  surgeMultiplier: 1,
  platformFeeBps: 1200,
  currency: 'ZAR'
} as const;
