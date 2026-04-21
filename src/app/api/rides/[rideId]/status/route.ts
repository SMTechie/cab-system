import { UserRole } from '@prisma/client';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { parseJsonBody } from '@/lib/request';
import { rideStatusSchema } from '@/lib/validators';
import { canAccessRide, canTransitionRide, getRideById } from '@/lib/ride-service';
import { serializeRide } from '@/lib/serializers';
import { appendRideEvent, emitRideState } from '@/lib/realtime';

export async function PATCH(request: Request, context: { params: { rideId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const { rideId } = context.params;
    const ride = await getRideById(rideId);
    const payload = await parseJsonBody(request, rideStatusSchema);

    if (session.role === UserRole.RIDER) {
      if (payload.status !== 'CANCELLED' || ride.riderId !== session.userId) {
        throw new AppError('Riders can only cancel their own active rides', 403, 'forbidden');
      }
    } else if (session.role === UserRole.DRIVER) {
      if (!canAccessRide(session.role, session.userId, ride)) {
        throw new AppError('Driver access required', 403, 'forbidden');
      }
    }

    if (session.role !== UserRole.ADMIN && !canTransitionRide(ride.status, payload.status)) {
      throw new AppError(`Cannot transition ride from ${ride.status} to ${payload.status}`, 409, 'invalid_transition');
    }

    const updated = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: payload.status,
        driverId:
          payload.status === 'ACCEPTED' && ride.driverId === null && session.role === UserRole.DRIVER
            ? session.userId
            : ride.driverId
      },
      include: {
        rider: { include: { driverProfile: true } },
        driver: { include: { driverProfile: true } },
        events: { orderBy: { createdAt: 'asc' } }
      }
    });

    await appendRideEvent(rideId, 'ride.status.changed', {
      from: ride.status,
      to: payload.status,
      changedBy: session.userId
    });

    emitRideState({
      rideId,
      status: updated.status,
      ride: serializeRide(updated)
    });

    return jsonSuccess({ ride: serializeRide(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
