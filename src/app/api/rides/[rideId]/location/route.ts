import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { canAccessRide, getRideById } from '@/lib/ride-service';
import { serializeDriverLocation, serializeRide } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: { rideId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const { rideId } = context.params;
    const ride = await getRideById(rideId);

    if (!canAccessRide(session.role, session.userId, ride) && session.role !== 'ADMIN') {
      return jsonError(new AppError('You do not have access to this ride', 403, 'forbidden'));
    }

    const driverLocation = ride.driverId
      ? await prisma.driverLocation.findUnique({
          where: { userId: ride.driverId }
        })
      : null;

    return jsonSuccess({
      ride: serializeRide(ride),
      driverLocation: driverLocation ? serializeDriverLocation(driverLocation) : null
    });
  } catch (error) {
    return jsonError(error);
  }
}
