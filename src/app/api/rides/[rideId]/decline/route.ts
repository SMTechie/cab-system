import { UserRole } from '@prisma/client';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { getSessionFromRequest } from '@/lib/session';
import { declineRideOffer } from '@/lib/dispatch';

export async function POST(request: Request, context: { params: { rideId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== UserRole.DRIVER) {
      return jsonError(new AppError('Driver access required', 403, 'forbidden'));
    }

    const { rideId } = context.params;
    await declineRideOffer(rideId, session.userId);
    return jsonSuccess({ accepted: false });
  } catch (error) {
    return jsonError(error);
  }
}
