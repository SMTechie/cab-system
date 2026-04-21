import type { DriverLocation, DriverProfile, Ride, RideEvent, User } from '@prisma/client';

export type SafeUser = Pick<User, 'id' | 'name' | 'email' | 'role'> & {
  phoneNumber: string | null;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
  driverProfile?: SafeDriverProfile | null;
};

export type SafeDriverProfile = Pick<
  DriverProfile,
  | 'id'
  | 'userId'
  | 'vehicleMake'
  | 'vehicleModel'
  | 'vehicleColor'
  | 'plateNumber'
  | 'serviceRadiusKm'
  | 'stripeAccountId'
  | 'commissionBps'
  | 'isAvailable'
> & {
  createdAt: string;
  updatedAt: string;
};

export type SafeDriverLocation = Pick<
  DriverLocation,
  'id' | 'userId' | 'latitude' | 'longitude' | 'heading' | 'speed' | 'accuracy'
> & {
  createdAt: string;
  updatedAt: string;
};

export type SafeRideEvent = Pick<RideEvent, 'id' | 'rideId' | 'type' | 'payload'> & {
  createdAt: string;
};

export type SafeRide = Pick<
  Ride,
  | 'id'
  | 'riderId'
  | 'driverId'
  | 'originLabel'
  | 'originLatitude'
  | 'originLongitude'
  | 'destinationLabel'
  | 'destinationLatitude'
  | 'destinationLongitude'
  | 'distanceKm'
  | 'durationMinutes'
  | 'baseFareCents'
  | 'perKmFareCents'
  | 'perMinuteFareCents'
  | 'surgeMultiplier'
  | 'estimatedFareCents'
  | 'platformFeeCents'
  | 'currency'
  | 'tripType'
  | 'bookingForName'
  | 'bookingForPhone'
  | 'parcelCount'
  | 'tipAmountCents'
  | 'shareToken'
  | 'status'
  | 'paymentStatus'
  | 'stripePaymentIntentId'
  | 'stripeChargeId'
  | 'notes'
> & {
  createdAt: string;
  updatedAt: string;
  rider?: SafeUser | null;
  driver?: SafeUser | null;
  scheduledAt: string | null;
  events?: SafeRideEvent[];
};

function serializeDate(value: Date) {
  return value.toISOString();
}

export function serializeUser(user: User & { driverProfile?: DriverProfile | null }): SafeUser {
  const { driverProfile, ...rest } = user;
  return {
    ...rest,
    phoneNumber: rest.phoneNumber,
    preferredLanguage: rest.preferredLanguage,
    createdAt: serializeDate(rest.createdAt),
    updatedAt: serializeDate(rest.updatedAt),
    driverProfile: driverProfile ? serializeDriverProfile(driverProfile) : null
  };
}

export function serializeDriverProfile(profile: DriverProfile): SafeDriverProfile {
  return {
    ...profile,
    createdAt: serializeDate(profile.createdAt),
    updatedAt: serializeDate(profile.updatedAt)
  };
}

export function serializeDriverLocation(location: DriverLocation): SafeDriverLocation {
  return {
    ...location,
    createdAt: serializeDate(location.createdAt),
    updatedAt: serializeDate(location.updatedAt)
  };
}

export function serializeRide(
  ride: Ride & { rider?: User | null; driver?: User | null; events?: RideEvent[] }
): SafeRide {
  const { rider, driver, events, ...rest } = ride;

  return {
    ...rest,
    scheduledAt: rest.scheduledAt ? serializeDate(rest.scheduledAt) : null,
    createdAt: serializeDate(rest.createdAt),
    updatedAt: serializeDate(rest.updatedAt),
    rider: rider ? serializeUser(rider) : null,
    driver: driver ? serializeUser(driver) : null,
    events: events?.map((event) => ({
      ...event,
      createdAt: serializeDate(event.createdAt)
    }))
  };
}
