import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { serializeRide } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: { token: string } }) {
  try {
    const ride = await prisma.ride.findUnique({
      where: { shareToken: context.params.token },
      include: {
        rider: { include: { driverProfile: true } },
        driver: { include: { driverProfile: true } },
        events: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!ride) {
      throw new AppError('Ride not found', 404, 'ride_not_found');
    }

    return jsonSuccess({
      ride: serializeRide(ride)
    });
  } catch (error) {
    return jsonError(error);
  }
}
