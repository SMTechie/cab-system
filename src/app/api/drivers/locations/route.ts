import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { jsonError, jsonSuccess } from '@/lib/api';
import { serializeDriverLocation, serializeUser } from '@/lib/serializers';
import { AppError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const params = new URL(request.url).searchParams;
    const availableOnly = params.get('availableOnly') !== 'false';

    const drivers = await prisma.driverProfile.findMany({
      where: availableOnly ? { isAvailable: true } : undefined,
      include: {
        user: {
          include: {
            driverProfile: true,
            driverLocation: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 30
    });

    return jsonSuccess({
      drivers: drivers.map((profile) => ({
        profile: {
          id: profile.id,
          userId: profile.userId,
          vehicleMake: profile.vehicleMake,
          vehicleModel: profile.vehicleModel,
          plateNumber: profile.plateNumber,
          stripeAccountId: profile.stripeAccountId,
          commissionBps: profile.commissionBps,
          isAvailable: profile.isAvailable,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString()
        },
        user: serializeUser(profile.user),
        location: profile.user.driverLocation ? serializeDriverLocation(profile.user.driverLocation) : null
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}
