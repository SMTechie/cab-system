import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { parseJsonBody } from '@/lib/request';
import { getRideById } from '@/lib/ride-service';
import { serializeRide } from '@/lib/serializers';
import { recordAuditLog } from '@/lib/audit';
import { RideOfferStatus } from '@prisma/client';

const assignSchema = z.object({
  driverId: z.string().min(1)
});

export async function POST(request: Request, context: { params: { rideId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== UserRole.ADMIN) {
      return jsonError(new AppError('Admin access required', 403, 'forbidden'));
    }

    const { rideId } = context.params;
    const payload = await parseJsonBody(request, assignSchema);
    const ride = await getRideById(rideId);

    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      throw new AppError('This ride cannot be reassigned', 409, 'ride_closed');
    }

    const driver = await prisma.user.findUnique({
      where: { id: payload.driverId },
      include: { driverProfile: true }
    });

    if (!driver || driver.role !== UserRole.DRIVER || !driver.driverProfile) {
      throw new AppError('Selected driver does not exist', 404, 'driver_not_found');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rideRecord = await tx.ride.update({
        where: { id: rideId },
        data: {
          driverId: payload.driverId,
          status: 'REQUESTED'
        },
        include: {
          rider: { include: { driverProfile: true } },
          driver: { include: { driverProfile: true } },
          events: { orderBy: { createdAt: 'asc' } }
        }
      });

      await tx.rideOffer.updateMany({
        where: {
          rideId,
          status: RideOfferStatus.PENDING
        },
        data: {
          status: RideOfferStatus.EXPIRED
        }
      });

      await tx.rideOffer.upsert({
        where: {
          rideId_driverId: {
            rideId,
            driverId: payload.driverId
          }
        },
        update: {
          offeredFareCents: rideRecord.estimatedFareCents,
          surgeMultiplier: rideRecord.surgeMultiplier,
          expiresAt: new Date(Date.now() + 1000 * 60 * 3),
          status: RideOfferStatus.PENDING
        },
        create: {
          rideId,
          driverId: payload.driverId,
          offeredFareCents: rideRecord.estimatedFareCents,
          surgeMultiplier: rideRecord.surgeMultiplier,
          expiresAt: new Date(Date.now() + 1000 * 60 * 3),
          status: RideOfferStatus.PENDING
        }
      });

      await tx.rideEvent.create({
        data: {
          rideId,
          type: 'ride.reassigned',
          payload: {
            driverId: payload.driverId,
            by: session.userId
          }
        }
      });

      return rideRecord;
    });

    await recordAuditLog({
      actorUserId: session.userId,
      action: 'admin.ride.assigned',
      entityType: 'Ride',
      entityId: rideId,
      payload: {
        driverId: payload.driverId
      }
    });

    return jsonSuccess({ ride: serializeRide(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
