import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { jsonError, jsonSuccess } from '@/lib/api';
import { parseJsonBody } from '@/lib/request';
import { availabilitySchema } from '@/lib/validators';
import { AppError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'DRIVER') {
      return jsonError(new AppError('Driver access required', 403, 'forbidden'));
    }

    const payload = await parseJsonBody(request, availabilitySchema);
    const profile = await prisma.driverProfile.upsert({
      where: { userId: session.userId },
      update: { isAvailable: payload.isAvailable },
      create: {
        userId: session.userId,
        isAvailable: payload.isAvailable
      }
    });

    return jsonSuccess({
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
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
