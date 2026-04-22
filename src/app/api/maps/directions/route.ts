import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { fetchDirections } from '@/lib/mapbox';
import { parseSearchParams } from '@/lib/request';
import { directionsSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const params = parseSearchParams(request);
    const parsed = directionsSchema.safeParse({
      originLatitude: params.get('originLatitude'),
      originLongitude: params.get('originLongitude'),
      destinationLatitude: params.get('destinationLatitude'),
      destinationLongitude: params.get('destinationLongitude')
    });

    if (!parsed.success) {
      return jsonError(new AppError('Invalid coordinates', 422, 'validation_error', parsed.error.flatten()));
    }

    const route = await fetchDirections(
      {
        latitude: parsed.data.originLatitude,
        longitude: parsed.data.originLongitude
      },
      {
        latitude: parsed.data.destinationLatitude,
        longitude: parsed.data.destinationLongitude
      }
    );

    return jsonSuccess({ route });
  } catch (error) {
    return jsonError(error);
  }
}
