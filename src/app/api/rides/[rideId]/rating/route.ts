import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { parseJsonBody } from '@/lib/request';
import { getRideById, canAccessRide } from '@/lib/ride-service';
import { recordAuditLog } from '@/lib/audit';

const ratingSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable()
});

export async function POST(request: Request, context: { params: { rideId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const { rideId } = context.params;
    const ride = await getRideById(rideId);

    if (ride.status !== 'COMPLETED') {
      throw new AppError('Ride must be completed before rating', 409, 'ride_not_completed');
    }

    if (!canAccessRide(session.role, session.userId, ride) && session.role !== UserRole.ADMIN) {
      return jsonError(new AppError('You do not have access to this ride', 403, 'forbidden'));
    }

    const payload = await parseJsonBody(request, ratingSchema);
    const targetUserId =
      session.role === UserRole.RIDER
        ? ride.driverId
        : session.role === UserRole.DRIVER
          ? ride.riderId
          : null;

    if (!targetUserId) {
      throw new AppError('Unable to determine who to rate', 409, 'rating_target_missing');
    }

    const rating = await prisma.rideRating.upsert({
      where: {
        rideId_raterUserId: {
          rideId,
          raterUserId: session.userId
        }
      },
      update: {
        ratedUserId: targetUserId,
        score: payload.score,
        comment: payload.comment ?? null
      },
      create: {
        rideId,
        raterUserId: session.userId,
        ratedUserId: targetUserId,
        score: payload.score,
        comment: payload.comment ?? null
      }
    });

    await recordAuditLog({
      actorUserId: session.userId,
      action: 'ride.rated',
      entityType: 'RideRating',
      entityId: rating.id,
      payload: {
        rideId,
        score: rating.score
      }
    });

    return jsonSuccess({
      rating: {
        id: rating.id,
        rideId: rating.rideId,
        raterUserId: rating.raterUserId,
        ratedUserId: rating.ratedUserId,
        score: rating.score,
        comment: rating.comment,
        createdAt: rating.createdAt.toISOString(),
        updatedAt: rating.updatedAt.toISOString()
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
