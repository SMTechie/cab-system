import { RideOfferStatus, type Ride, type RideOffer, type UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { haversineKm, type Coordinate } from '@/lib/geo';
import { emitRideOffer, emitRideState } from '@/lib/realtime';
import { serializeRide } from '@/lib/serializers';
import { appendRideEvent } from '@/lib/realtime';
import { AppError } from '@/lib/errors';

export interface DispatchOfferSummary {
  offerId: string;
  rideId: string;
  driverId: string;
  driverName: string;
  vehicleLabel: string;
  plateNumber: string | null;
  distanceKm: number | null;
  etaMinutes: number;
  recommendedFareCents: number;
  expiresAt: string;
}

export interface DispatchRideInput {
  rideId: string;
}

interface DriverCandidate {
  profile: {
    userId: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    plateNumber: string | null;
    commissionBps: number;
  };
  user: {
    id: string;
    name: string;
    role: UserRole;
    driverLocation: {
      latitude: number;
      longitude: number;
    } | null;
  };
}

function estimateEtaMinutes(distanceKm: number | null, fallbackIndex: number) {
  if (distanceKm === null) {
    return 6 + fallbackIndex * 2;
  }

  return Math.max(3, Math.round(distanceKm * 4));
}

function vehicleLabel(candidate: DriverCandidate) {
  const make = candidate.profile.vehicleMake ?? 'Vehicle';
  const model = candidate.profile.vehicleModel ?? '';
  return [make, model].filter(Boolean).join(' ').trim();
}

async function buildCandidates(origin: Coordinate, limit = 3) {
  const drivers = await prisma.driverProfile.findMany({
    where: { isAvailable: true },
    include: {
      user: {
        include: {
          driverLocation: true
        }
      }
    },
    take: 20,
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return drivers
    .map((driver) => {
      const candidate: DriverCandidate = {
        profile: {
          userId: driver.userId,
          vehicleMake: driver.vehicleMake,
          vehicleModel: driver.vehicleModel,
          plateNumber: driver.plateNumber,
          commissionBps: driver.commissionBps
        },
        user: {
          id: driver.user.id,
          name: driver.user.name,
          role: driver.user.role,
          driverLocation: driver.user.driverLocation
            ? {
                latitude: driver.user.driverLocation.latitude,
                longitude: driver.user.driverLocation.longitude
              }
            : null
        }
      };

      const distanceKm = candidate.user.driverLocation ? haversineKm(origin, candidate.user.driverLocation) : null;
      const etaMinutes = estimateEtaMinutes(distanceKm, 0);

      return {
        candidate,
        distanceKm,
        etaMinutes
      };
    })
    .sort((left, right) => {
      if (left.distanceKm === null && right.distanceKm === null) return 0;
      if (left.distanceKm === null) return 1;
      if (right.distanceKm === null) return -1;
      return left.distanceKm - right.distanceKm;
    })
    .slice(0, limit);
}

export async function dispatchRideRequest(rideId: string) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      rider: true,
      driver: true,
      offers: true
    }
  });

  if (!ride) {
    throw new AppError('Ride not found', 404, 'ride_not_found');
  }

  if (ride.driverId) {
    return [];
  }

  const candidates = await buildCandidates(
    {
      latitude: ride.originLatitude,
      longitude: ride.originLongitude
    },
    3
  );

  const expiry = new Date(Date.now() + 1000 * 60 * 3);

  const createdOffers = await prisma.$transaction(async (tx) => {
    const offers: RideOffer[] = [];

    for (const [index, entry] of candidates.entries()) {
      const offeredFareCents = Math.max(
        ride.estimatedFareCents,
        ride.estimatedFareCents + Math.round((entry.distanceKm ?? index + 1) * 25)
      );

      const offer = await tx.rideOffer.upsert({
        where: {
          rideId_driverId: {
            rideId,
            driverId: entry.candidate.user.id
          }
        },
        update: {
          offeredFareCents,
          surgeMultiplier: ride.surgeMultiplier,
          expiresAt: expiry,
          status: RideOfferStatus.PENDING
        },
        create: {
          rideId,
          driverId: entry.candidate.user.id,
          offeredFareCents,
          surgeMultiplier: ride.surgeMultiplier,
          expiresAt: expiry,
          status: RideOfferStatus.PENDING
        }
      });

      offers.push(offer);
    }

    await tx.rideEvent.create({
      data: {
        rideId,
        type: 'ride.dispatched',
        payload: {
          targetCount: offers.length,
          expiresAt: expiry.toISOString()
        }
      }
    });

    return offers;
  });

  const serializedRide = serializeRide(ride);
  for (const [index, entry] of candidates.entries()) {
    const offer = createdOffers[index];
    if (!offer) continue;
    const summary: DispatchOfferSummary & { riderName: string; originLabel: string; destinationLabel: string } = {
      offerId: offer.id,
      rideId,
      driverId: entry.candidate.user.id,
      driverName: entry.candidate.user.name,
      vehicleLabel: vehicleLabel(entry.candidate),
      plateNumber: entry.candidate.profile.plateNumber,
      distanceKm: entry.distanceKm,
      etaMinutes: estimateEtaMinutes(entry.distanceKm, index),
      recommendedFareCents: offer.offeredFareCents,
      expiresAt: offer.expiresAt.toISOString(),
      riderName: serializedRide.rider?.name ?? 'Rider',
      originLabel: serializedRide.originLabel,
      destinationLabel: serializedRide.destinationLabel
    };
    emitRideOffer(summary);
  }

  return createdOffers;
}

export async function claimRideOffer(rideId: string, driverId: string) {
  const rideSnapshot = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      rider: { include: { driverProfile: true } },
      driver: { include: { driverProfile: true } },
      offers: true,
      events: { orderBy: { createdAt: 'asc' } }
    }
  });

  if (!rideSnapshot) {
    throw new AppError('Ride not found', 404, 'ride_not_found');
  }

  if (rideSnapshot.status === 'COMPLETED' || rideSnapshot.status === 'CANCELLED') {
    throw new AppError('This ride cannot be accepted', 409, 'ride_closed');
  }

  if (rideSnapshot.driverId && rideSnapshot.driverId !== driverId) {
    throw new AppError('Ride already assigned', 409, 'ride_assigned');
  }

  const offer = rideSnapshot.offers.find((entry) => entry.driverId === driverId && entry.status === RideOfferStatus.PENDING);

  if (!offer && rideSnapshot.driverId !== driverId) {
    throw new AppError('No offer found for this driver', 404, 'offer_not_found');
  }

  if (!offer && rideSnapshot.driverId === driverId && rideSnapshot.status === 'ACCEPTED') {
    return rideSnapshot;
  }

  if (!offer && rideSnapshot.driverId === driverId) {
    const updated = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'ACCEPTED'
      },
      include: {
        rider: { include: { driverProfile: true } },
        driver: { include: { driverProfile: true } },
        events: { orderBy: { createdAt: 'asc' } }
      }
    });

    await appendRideEvent(rideId, 'ride.accepted', {
      driverId,
      acceptedBy: driverId,
      mode: 'manual_assignment'
    });

    emitRideState({
      rideId,
      status: updated.status,
      ride: serializeRide(updated)
    });

    return updated;
  }

  const offerRecord = await prisma.rideOffer.findUnique({
    where: {
      rideId_driverId: {
        rideId,
        driverId
      }
    },
    include: {
      ride: {
        include: {
          rider: true,
          driver: true,
          offers: true
        }
      }
    }
  });

  if (!offerRecord) {
    throw new AppError('No offer found for this driver', 404, 'offer_not_found');
  }

  if (offerRecord.status === RideOfferStatus.EXPIRED) {
    throw new AppError('This offer has expired', 409, 'offer_expired');
  }

  if (offerRecord.ride.driverId && offerRecord.ride.driverId !== driverId) {
    throw new AppError('Ride already assigned', 409, 'ride_assigned');
  }

  const updatedRide = await prisma.$transaction(async (tx) => {
    const updatedRide = await tx.ride.update({
      where: { id: rideId },
      data: {
        driverId,
        status: 'ACCEPTED'
      },
      include: {
        rider: { include: { driverProfile: true } },
        driver: { include: { driverProfile: true } },
        events: { orderBy: { createdAt: 'asc' } }
      }
    });

    await tx.rideOffer.update({
      where: { id: offerRecord.id },
      data: {
        status: RideOfferStatus.ACCEPTED
      }
    });

    await tx.rideOffer.updateMany({
      where: {
        rideId,
        id: { not: offerRecord.id },
        status: RideOfferStatus.PENDING
      },
      data: {
        status: RideOfferStatus.EXPIRED
      }
    });

    await tx.rideEvent.create({
      data: {
        rideId,
        type: 'ride.accepted',
        payload: {
          driverId,
          offerId: offerRecord.id
        }
      }
    });

    return updatedRide;
  });

  emitRideState({
    rideId,
    status: updatedRide.status,
    ride: serializeRide(updatedRide)
  });

  return updatedRide;
}

export async function declineRideOffer(rideId: string, driverId: string) {
  const offer = await prisma.rideOffer.findUnique({
    where: {
      rideId_driverId: {
        rideId,
        driverId
      }
    }
  });

  if (!offer) {
    throw new AppError('No offer found for this driver', 404, 'offer_not_found');
  }

  if (offer.status === RideOfferStatus.ACCEPTED) {
    throw new AppError('This ride was already accepted', 409, 'ride_assigned');
  }

  if (offer.status === RideOfferStatus.DECLINED) {
    return offer;
  }

  const updatedOffer = await prisma.$transaction(async (tx) => {
    const next = await tx.rideOffer.update({
      where: { id: offer.id },
      data: {
        status: RideOfferStatus.DECLINED
      }
    });

    await tx.rideEvent.create({
      data: {
        rideId,
        type: 'ride.offer_declined',
        payload: {
          driverId,
          offerId: offer.id
        }
      }
    });

    return next;
  });

  return updatedOffer;
}

export async function expireStaleRideOffers() {
  const result = await prisma.rideOffer.updateMany({
    where: {
      status: RideOfferStatus.PENDING,
      expiresAt: {
        lt: new Date()
      }
    },
    data: {
      status: RideOfferStatus.EXPIRED
    }
  });

  return result.count;
}
