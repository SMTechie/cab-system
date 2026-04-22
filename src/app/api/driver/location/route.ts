import { jsonError, jsonSuccess } from '@/lib/api';
import { persistDriverLocation } from '@/lib/realtime';
import { getSessionFromRequest } from '@/lib/session';
import { parseJsonBody } from '@/lib/request';
import { locationSchema } from '@/lib/validators';
import { AppError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'DRIVER') {
      return jsonError(new AppError('Driver access required', 403, 'forbidden'));
    }

    const payload = await parseJsonBody(request, locationSchema);
    const location = await persistDriverLocation({
      driverId: session.userId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      heading: payload.heading ?? null,
      speed: payload.speed ?? null,
      accuracy: payload.accuracy ?? null,
      rideId: payload.rideId ?? null
    });

    return jsonSuccess({ location });
  } catch (error) {
    return jsonError(error);
  }
}
