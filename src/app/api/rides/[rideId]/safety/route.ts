import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { parseJsonBody } from '@/lib/request';
import { getRideById, canAccessRide } from '@/lib/ride-service';
import { recordAuditLog } from '@/lib/audit';
import { emitRideSafety } from '@/lib/realtime';
import { assertRateLimit, getRequestFingerprint } from '@/lib/rate-limit';
import { runIdempotent } from '@/lib/idempotency';

const safetySchema = z.object({
  type: z.string().min(2).max(60).default('sos'),
  message: z.string().min(2).max(500)
});

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: { rideId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const { rideId } = context.params;
    assertRateLimit(`safety:${session.userId}:${getRequestFingerprint(request)}`);
    const ride = await getRideById(rideId);

    if (!canAccessRide(session.role, session.userId, ride) && session.role !== UserRole.ADMIN) {
      return jsonError(new AppError('You do not have access to this ride', 403, 'forbidden'));
    }

    const payload = await parseJsonBody(request, safetySchema);
    const idempotencyKey = request.headers.get('idempotency-key');

    const result = await runIdempotent(
      `POST /api/rides/${rideId}/safety`,
      idempotencyKey,
      session.userId,
      async () => {
        const alert = await prisma.rideSafetyAlert.create({
          data: {
            rideId,
            reporterUserId: session.userId,
            type: payload.type,
            message: payload.message
          }
        });

        await prisma.rideEvent.create({
          data: {
            rideId,
            type: 'ride.safety.alert',
            payload: {
              alertId: alert.id,
              type: alert.type,
              message: alert.message
            }
          }
        });

        await recordAuditLog({
          actorUserId: session.userId,
          action: 'ride.safety_alert',
          entityType: 'RideSafetyAlert',
          entityId: alert.id,
          payload: {
            rideId,
            type: alert.type,
            message: alert.message
          }
        });

        emitRideSafety({
          alertId: alert.id,
          rideId,
          reporterUserId: session.userId,
          type: alert.type,
          message: alert.message,
          status: alert.status,
          createdAt: alert.createdAt.toISOString()
        });

        return {
          alert: {
            id: alert.id,
            rideId: alert.rideId,
            reporterUserId: alert.reporterUserId,
            type: alert.type,
            message: alert.message,
            status: alert.status,
            createdAt: alert.createdAt.toISOString()
          }
        };
      }
    );

    return jsonSuccess(result.result);
  } catch (error) {
    return jsonError(error);
  }
}
