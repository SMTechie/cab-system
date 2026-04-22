import { UserRole } from '@prisma/client';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { getPlatformFeeBps, getStripe } from '@/lib/stripe';
import { getSessionFromRequest } from '@/lib/session';
import { getRideById } from '@/lib/ride-service';
import { recordAuditLog } from '@/lib/audit';
import { assertRateLimit, getRequestFingerprint } from '@/lib/rate-limit';
import { runIdempotent } from '@/lib/idempotency';
import { parseJsonBody } from '@/lib/request';
import { paymentIntentTipSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: { rideId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || (session.role !== UserRole.RIDER && session.role !== UserRole.ADMIN)) {
      return jsonError(new AppError('Rider access required', 403, 'forbidden'));
    }

    const { rideId } = context.params;
    assertRateLimit(`payment-intent:${session.userId}:${getRequestFingerprint(request)}`);
    const idempotencyKey = request.headers.get('idempotency-key');
    const payload = await parseJsonBody(request, paymentIntentTipSchema);

    const ride = await getRideById(rideId);
    if (session.role !== UserRole.ADMIN && ride.riderId !== session.userId) {
      return jsonError(new AppError('You do not have access to this ride', 403, 'forbidden'));
    }

    if (ride.status !== 'COMPLETED') {
      throw new AppError('Ride must be completed before payment can be created', 409, 'ride_not_completed');
    }

    const result = await runIdempotent(
      `POST /api/rides/${rideId}/payment-intent`,
      idempotencyKey,
      session.userId,
      async () => {
        const stripe = getStripe();
        const driverAccountId = ride.driver?.driverProfile?.stripeAccountId ?? null;
        const existingPaymentIntentId = ride.stripePaymentIntentId;
        const tipAmountCents = payload.tipAmountCents ?? ride.tipAmountCents ?? 0;
        const totalAmountCents = ride.estimatedFareCents + tipAmountCents;

        if (!existingPaymentIntentId && tipAmountCents !== ride.tipAmountCents) {
          await prisma.ride.update({
            where: { id: rideId },
            data: {
              tipAmountCents
            }
          });
        }

        if (existingPaymentIntentId) {
          const existing = await stripe.paymentIntents.retrieve(existingPaymentIntentId);
          return {
            paymentIntentId: existing.id,
            clientSecret: existing.client_secret,
            status: existing.status
          };
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: totalAmountCents,
          currency: ride.currency.toLowerCase(),
          automatic_payment_methods: {
            enabled: true
          },
          application_fee_amount: driverAccountId
            ? ride.platformFeeCents || Math.round((ride.estimatedFareCents * getPlatformFeeBps()) / 10_000)
            : undefined,
          transfer_data: driverAccountId
            ? {
                destination: driverAccountId
              }
            : undefined,
          metadata: {
            rideId: ride.id,
            riderId: ride.riderId,
            driverId: ride.driverId ?? '',
            platform: 'cabflow',
            tipAmountCents: String(tipAmountCents)
          }
        });

        await prisma.ride.update({
          where: { id: rideId },
          data: {
            stripePaymentIntentId: paymentIntent.id,
            paymentStatus: 'REQUIRES_PAYMENT_METHOD',
            tipAmountCents
          }
        });

        await recordAuditLog({
          actorUserId: session.userId,
          action: 'ride.payment_intent.created',
          entityType: 'Ride',
          entityId: rideId,
          payload: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            tipAmountCents
          }
        });

        return {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status
        };
      }
    );

    return jsonSuccess(result.result);
  } catch (error) {
    return jsonError(error);
  }
}
