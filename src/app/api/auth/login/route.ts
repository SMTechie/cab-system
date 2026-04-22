import { authenticateUser } from '@/lib/auth';
import { jsonError, jsonSuccess } from '@/lib/api';
import { applySessionCookie } from '@/lib/session';
import { parseJsonBody } from '@/lib/request';
import { loginSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, loginSchema);
    const { safeUser, cookie } = await authenticateUser(payload.email, payload.password);
    const response = jsonSuccess({ user: safeUser });
    return applySessionCookie(response, cookie);
  } catch (error) {
    return jsonError(error);
  }
}
