import { buildClearedSessionCookie, applySessionCookie } from '@/lib/session';
import { jsonError, jsonSuccess } from '@/lib/api';

export async function POST() {
  try {
    const response = jsonSuccess({ ok: true });
    return applySessionCookie(response, buildClearedSessionCookie());
  } catch (error) {
    return jsonError(error);
  }
}
