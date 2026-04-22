import { Prisma, UserRole, type RideStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { jsonError, jsonSuccess } from '@/lib/api';
import { getSessionFromRequest } from '@/lib/session';
import { parseJsonBody } from '@/lib/request';
import { rideCreateSchema } from '@/lib/validators';
import { calculateFare } from '@/lib/fare';
import { prisma } from '@/lib/prisma';
import { serializeRide } from '@/lib/serializers';
import { emitRideState } from '@/lib/realtime';
import { dispatchRideRequest } from '@/lib/dispatch';
import { recordAuditLog } from '@/lib/audit';
import { assertRateLimit, getRequestFingerprint } from '@/lib/rate-limit';
import { runIdempotent } from '@/lib/idempotency';

export const dynamic = 'force-dynamic';

function serializeRideQueryStatus(status: string | null): RideStatus | null {
  if (!status) return null;
  if (['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED'].includes(status)) {
    return status as RideStatus;
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const params = new URL(request.url).searchParams;
    const status = serializeRideQueryStatus(params.get('status'));

    const where: Prisma.RideWhereInput =
      session.role === UserRole.RIDER
        ? { riderId: session.userId, ...(status ? { status } : {}) }
        : session.role === UserRole.DRIVER
          ? { driverId: session.userId, ...(status ? { status } : {}) }
          : status
            ? { status }
            : {};

    const rides = await prisma.ride.findMany({
      where,
      include: {
        rider: { include: { driverProfile: true } },
        driver: { include: { driverProfile: true } },
        events: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' },
      take: 25
    });

    return jsonSuccess({ rides: rides.map(serializeRide) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || (session.role !== UserRole.RIDER && session.role !== UserRole.ADMIN)) {
      return jsonError(new AppError('Rider access required', 403, 'forbidden'));
    }

    assertRateLimit(`ride:create:${session.userId}:${getRequestFingerprint(request)}`);
    const payload = await parseJsonBody(request, rideCreateSchema);
    const idempotencyKey = request.headers.get('idempotency-key');
    const scheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : null;

    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      throw new AppError('Invalid schedule date', 422, 'invalid_schedule_date');
    }

    const { result } = await runIdempotent(
      'POST /api/rides',
      idempotencyKey,
      session.userId,
      async () => {
        const quote = calculateFare({
          distanceKm: payload.distanceKm,
          durationMinutes: payload.durationMinutes,
          surgeMultiplier: payload.surgeMultiplier,
          platformFeeBps: env.STRIPE_PLATFORM_FEE_BPS
        });

        if (payload.driverId) {
          const driver = await prisma.user.findUnique({
            where: { id: payload.driverId },
            include: { driverProfile: true }
          });

          if (!driver || driver.role !== UserRole.DRIVER || !driver.driverProfile) {
            throw new AppError('Selected driver does not exist', 404, 'driver_not_found');
          }

          if (!driver.driverProfile.isAvailable) {
            throw new AppError('Selected driver is not available', 409, 'driver_unavailable');
          }
        }

        const created = await prisma.$transaction(async (tx) => {
          const ride = await tx.ride.create({
            data: {
              riderId: session.userId,
              driverId: payload.driverId ?? null,
              originLabel: payload.originLabel,
              originLatitude: payload.originLatitude,
              originLongitude: payload.originLongitude,
              destinationLabel: payload.destinationLabel,
              destinationLatitude: payload.destinationLatitude,
              destinationLongitude: payload.destinationLongitude,
              distanceKm: payload.distanceKm,
              durationMinutes: payload.durationMinutes,
              baseFareCents: quote.baseFareCents,
              perKmFareCents: quote.perKmFareCents,
              perMinuteFareCents: quote.perMinuteFareCents,
              surgeMultiplier: quote.surgeMultiplier,
              estimatedFareCents: quote.estimatedFareCents,
              platformFeeCents: quote.platformFeeCents,
              currency: quote.currency,
              tripType: payload.tripType,
              scheduledAt,
              bookingForName: payload.bookingForName ?? null,
              bookingForPhone: payload.bookingForPhone ?? null,
              parcelCount: payload.parcelCount,
              notes: payload.notes ?? null,
              shareToken: randomUUID()
            }
          });

          await tx.rideEvent.create({
            data: {
              rideId: ride.id,
              type: 'ride.requested',
              payload: {
                estimatedFareCents: quote.estimatedFareCents,
                platformFeeCents: quote.platformFeeCents,
                dispatchMode: payload.driverId ? 'selected_driver' : 'broadcast',
                tripType: payload.tripType,
                scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
                bookingForName: payload.bookingForName ?? null,
                bookingForPhone: payload.bookingForPhone ?? null,
                parcelCount: payload.parcelCount
              }
            }
          });

          return tx.ride.findUnique({
            where: { id: ride.id },
            include: {
              rider: { include: { driverProfile: true } },
              driver: { include: { driverProfile: true } },
              events: { orderBy: { createdAt: 'asc' } }
            }
          });
        });

        if (!created) {
          throw new AppError('Unable to create ride', 500, 'ride_create_failed');
        }

        await recordAuditLog({
          actorUserId: session.userId,
          action: 'ride.requested',
          entityType: 'Ride',
          entityId: created.id,
          payload: {
            driverId: payload.driverId ?? null,
            fare: quote.estimatedFareCents,
            dispatchMode: payload.driverId ? 'selected_driver' : 'broadcast',
            tripType: payload.tripType,
            scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
            bookingForName: payload.bookingForName ?? null,
            bookingForPhone: payload.bookingForPhone ?? null,
            parcelCount: payload.parcelCount
          }
        });

        if (!payload.driverId) {
          await dispatchRideRequest(created.id);
        }

        return {
          ride: serializeRide(created)
        };
      }
    );

    emitRideState({
      rideId: result.ride.id,
      status: result.ride.status,
      ride: result.ride
    });

    return jsonSuccess(result, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
