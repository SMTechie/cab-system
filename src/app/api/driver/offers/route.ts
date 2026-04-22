import { UserRole } from '@prisma/client';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== UserRole.DRIVER) {
      return jsonError(new AppError('Driver access required', 403, 'forbidden'));
    }

    const now = new Date();
    await prisma.rideOffer.updateMany({
      where: {
        driverId: session.userId,
        status: 'PENDING',
        expiresAt: { lt: now }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    const offers = await prisma.rideOffer.findMany({
      where: {
        driverId: session.userId,
        status: 'PENDING',
        expiresAt: { gt: now }
      },
      include: {
        ride: {
          include: {
            rider: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 12
    });

    await recordAuditLog({
      actorUserId: session.userId,
      action: 'driver.offers.viewed',
      entityType: 'RideOffer',
      payload: {
        count: offers.length
      }
    });

    return jsonSuccess({
      offers: offers.map((offer) => ({
        id: offer.id,
        rideId: offer.rideId,
        driverId: offer.driverId,
        offeredFareCents: offer.offeredFareCents,
        surgeMultiplier: offer.surgeMultiplier,
        status: offer.status,
        expiresAt: offer.expiresAt.toISOString(),
        createdAt: offer.createdAt.toISOString(),
        ride: {
          id: offer.ride.id,
          originLabel: offer.ride.originLabel,
          destinationLabel: offer.ride.destinationLabel,
          distanceKm: offer.ride.distanceKm,
          durationMinutes: offer.ride.durationMinutes,
          riderName: offer.ride.rider.name
        }
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}
