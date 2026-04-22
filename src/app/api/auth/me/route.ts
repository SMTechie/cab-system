import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { jsonError, jsonSuccess } from '@/lib/api';
import { serializeUser } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonSuccess({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { driverProfile: true }
    });

    return jsonSuccess({ user: user ? serializeUser(user) : null });
  } catch (error) {
    return jsonError(error);
  }
}
