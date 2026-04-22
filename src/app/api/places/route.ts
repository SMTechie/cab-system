import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { getSessionFromRequest } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { parseJsonBody } from '@/lib/request';
import { recordAuditLog } from '@/lib/audit';

const placeSchema = z.object({
  label: z.string().min(2).max(120),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  kind: z.string().min(2).max(40).optional()
});

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const places = await prisma.savedPlace.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: 'desc' }
    });

    return jsonSuccess({
      places: places.map((place) => ({
        id: place.id,
        label: place.label,
        latitude: place.latitude,
        longitude: place.longitude,
        kind: place.kind,
        createdAt: place.createdAt.toISOString(),
        updatedAt: place.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== UserRole.RIDER) {
      return jsonError(new AppError('Rider access required', 403, 'forbidden'));
    }

    const payload = await parseJsonBody(request, placeSchema);
    const place = await prisma.savedPlace.create({
      data: {
        userId: session.userId,
        label: payload.label,
        latitude: payload.latitude,
        longitude: payload.longitude,
        kind: payload.kind ?? 'CUSTOM'
      }
    });

    await recordAuditLog({
      actorUserId: session.userId,
      action: 'saved_place.created',
      entityType: 'SavedPlace',
      entityId: place.id,
      payload: {
        label: place.label,
        kind: place.kind
      }
    });

    return jsonSuccess(
      {
        place: {
          id: place.id,
          label: place.label,
          latitude: place.latitude,
          longitude: place.longitude,
          kind: place.kind,
          createdAt: place.createdAt.toISOString(),
          updatedAt: place.updatedAt.toISOString()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error);
  }
}
