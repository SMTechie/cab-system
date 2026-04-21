import { jsonError, jsonSuccess } from '@/lib/api';
import { calculateFare } from '@/lib/fare';
import { parseJsonBody } from '@/lib/request';
import { fareEstimateSchema } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, fareEstimateSchema);
    const quote = calculateFare(payload);
    return jsonSuccess({ quote });
  } catch (error) {
    return jsonError(error);
  }
}
