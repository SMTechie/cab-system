import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { searchPlaces } from '@/lib/mapbox';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const query = params.get('q')?.trim() ?? '';
    const limit = Number(params.get('limit') ?? '5');

    if (!query) {
      return jsonSuccess({ places: [] });
    }

    const places = await searchPlaces(query, Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 8) : 5);
    return jsonSuccess({ places });
  } catch (error) {
    return jsonError(error instanceof AppError ? error : error);
  }
}
