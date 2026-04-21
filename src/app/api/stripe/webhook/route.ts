import Stripe from 'stripe';
import { env } from '@/lib/env';
import { jsonError, jsonSuccess } from '@/lib/api';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { emitRideState } from '@/lib/realtime';
import { serializeRide } from '@/lib/serializers';
import { AppError } from '@/lib/errors';

export async function POST(request: Request) {
  try {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError('Stripe webhook secret is not configured', 500, 'stripe_not_configured');
    }

    const stripe = getStripe();
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      throw new AppError('Missing Stripe signature header', 400, 'missing_signature');
    }

    const rawBody = await request.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new AppError('Invalid Stripe webhook signature', 400, 'invalid_signature');
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const rideId = paymentIntent.metadata.rideId;
        if (rideId) {
          const ride = await prisma.ride.update({
            where: { id: rideId },
            data: {
              paymentStatus: 'PAID',
              stripeChargeId: typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : paymentIntent.id
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
              type: 'payment.succeeded',
              payload: {
                paymentIntentId: paymentIntent.id,
                chargeId: ride.stripeChargeId
              }
            }
          });

          emitRideState({
            rideId,
            status: ride.status,
            paymentStatus: ride.paymentStatus,
            ride: serializeRide(ride)
          });
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const rideId = paymentIntent.metadata.rideId;
        if (rideId) {
          const ride = await prisma.ride.update({
            where: { id: rideId },
            data: {
              paymentStatus: 'FAILED'
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
              type: 'payment.failed',
              payload: {
                paymentIntentId: paymentIntent.id
              }
            }
          });

          emitRideState({
            rideId,
            status: ride.status,
            paymentStatus: ride.paymentStatus,
            ride: serializeRide(ride)
          });
        }
        break;
      }
      case 'account.updated':
        break;
      default:
        break;
    }

    return jsonSuccess({ received: true });
  } catch (error) {
    return jsonError(error);
  }
}
