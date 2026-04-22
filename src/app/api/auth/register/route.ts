import { applySessionCookie, buildSessionCookie, signSession, sessionFromSafeUser } from '@/lib/session';
import { createUser } from '@/lib/auth';
import { jsonError, jsonSuccess } from '@/lib/api';
import { parseJsonBody } from '@/lib/request';
import { registerSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, registerSchema);
    const user = await createUser(payload);
    const token = await signSession(sessionFromSafeUser(user));
    const response = jsonSuccess({ user }, { status: 201 });
    return applySessionCookie(response, buildSessionCookie(token));
  } catch (error) {
    return jsonError(error);
  }
}
