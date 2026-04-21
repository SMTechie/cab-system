import { UserRole } from '@prisma/client';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { getSessionFromRequest } from '@/lib/session';
import { getRideById } from '@/lib/ride-service';
import { recordAuditLog } from '@/lib/audit';
import { serializeRide } from '@/lib/serializers';
import { emitRideState } from '@/lib/realtime';
import { assertRateLimit, getRequestFingerprint } from '@/lib/rate-limit';
import { runIdempotent } from '@/lib/idempotency';

export async function POST(request: Request, context: { params: { rideId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== UserRole.ADMIN) {
      return jsonError(new AppError('Admin access required', 403, 'forbidden'));
    }

    const { rideId } = context.params;
    assertRateLimit(`refund:${session.userId}:${getRequestFingerprint(request)}`);
    const idempotencyKey = request.headers.get('idempotency-key');

    const result = await runIdempotent(
      `POST /api/rides/${rideId}/refund`,
      idempotencyKey,
      session.userId,
      async () => {
        const ride = await getRideById(rideId);

        if (ride.paymentStatus === 'REFUNDED') {
          throw new AppError('This ride has already been refunded', 409, 'already_refunded');
        }

        if (ride.paymentStatus !== 'PAID') {
          throw new AppError('Only paid rides can be refunded', 409, 'ride_not_paid');
        }

        if (!ride.stripePaymentIntentId) {
          throw new AppError('No payment intent exists for this ride', 409, 'payment_missing');
        }

        const stripe = getStripe();
        const refund = await stripe.refunds.create({
          payment_intent: ride.stripePaymentIntentId,
          reason: 'requested_by_customer'
        });

        const updated = await prisma.ride.update({
          where: { id: rideId },
          data: {
            paymentStatus: 'REFUNDED'
          },
          include: {
            rider: { include: { driverProfile: true } },
            driver: { include: { driverProfile: true } },
            events: { orderBy: { createdAt: 'asc' } }
          }
        });

        await prisma.rideEvent.create({
          data: {
            rideId,
            type: 'payment.refunded',
            payload: {
              refundId: refund.id,
              amount: refund.amount,
              currency: refund.currency
            }
          }
        });

        await recordAuditLog({
          actorUserId: session.userId,
          action: 'ride.refunded',
          entityType: 'Ride',
          entityId: rideId,
          payload: {
            refundId: refund.id,
            amount: refund.amount
          }
        });

        emitRideState({
          rideId,
          status: updated.status,
          paymentStatus: updated.paymentStatus,
          ride: serializeRide(updated)
        });

        return {
          ride: serializeRide(updated),
          refund: {
            id: refund.id,
            status: refund.status
          }
        };
      }
    );

    return jsonSuccess(result.result);
  } catch (error) {
    return jsonError(error);
  }
}
