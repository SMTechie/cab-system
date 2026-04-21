import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import type { UserRole } from '@/lib/roles';
import type { RideStatus } from '@prisma/client';

export const rideTransitions: Record<RideStatus, RideStatus[]> = {
  REQUESTED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED'],
  EN_ROUTE: ['ARRIVED', 'COMPLETED', 'CANCELLED'],
  ARRIVED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

export function canTransitionRide(from: RideStatus, to: RideStatus) {
  return rideTransitions[from].includes(to) || from === to;
}

export async function getRideById(rideId: string) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      rider: { include: { driverProfile: true } },
      driver: { include: { driverProfile: true } },
      events: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!ride) {
    throw new AppError('Ride not found', 404, 'ride_not_found');
  }

  return ride;
}

export function canAccessRide(role: UserRole, userId: string, ride: Awaited<ReturnType<typeof getRideById>>) {
  if (role === 'ADMIN') return true;
  if (role === 'RIDER') return ride.riderId === userId;
  if (role === 'DRIVER') return ride.driverId === userId;
  return false;
}
