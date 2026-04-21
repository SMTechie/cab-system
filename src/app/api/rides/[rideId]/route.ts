import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { getSessionFromRequest } from '@/lib/session';
import { canAccessRide, getRideById } from '@/lib/ride-service';
import { serializeRide } from '@/lib/serializers';

export async function GET(request: Request, context: { params: { rideId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const { rideId } = context.params;
    const ride = await getRideById(rideId);

    if (!canAccessRide(session.role, session.userId, ride)) {
      return jsonError(new AppError('You do not have access to this ride', 403, 'forbidden'));
    }

    return jsonSuccess({ ride: serializeRide(ride) });
  } catch (error) {
    return jsonError(error);
  }
}
