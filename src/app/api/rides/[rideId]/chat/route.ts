import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { parseJsonBody } from '@/lib/request';
import { canAccessRide, getRideById } from '@/lib/ride-service';
import { recordAuditLog } from '@/lib/audit';

const messageSchema = z.object({
  message: z.string().min(1).max(500)
});

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: { rideId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const { rideId } = context.params;
    const ride = await getRideById(rideId);

    if (!canAccessRide(session.role, session.userId, ride) && session.role !== UserRole.ADMIN) {
      return jsonError(new AppError('You do not have access to this ride', 403, 'forbidden'));
    }

    const messages = ride.events
      ?.filter((event) => event.type === 'ride.chat.message')
      .map((event) => ({
        id: event.id,
        rideId: event.rideId,
        senderId: typeof event.payload === 'object' && event.payload && 'senderId' in event.payload ? String(event.payload.senderId) : '',
        senderName: typeof event.payload === 'object' && event.payload && 'senderName' in event.payload ? String(event.payload.senderName) : '',
        role: typeof event.payload === 'object' && event.payload && 'role' in event.payload ? String(event.payload.role) : '',
        message: typeof event.payload === 'object' && event.payload && 'message' in event.payload ? String(event.payload.message) : '',
        createdAt: event.createdAt.toISOString()
      })) ?? [];

    return jsonSuccess({ messages });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: { params: { rideId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const { rideId } = context.params;
    const ride = await getRideById(rideId);

    if (!canAccessRide(session.role, session.userId, ride) && session.role !== UserRole.ADMIN) {
      return jsonError(new AppError('You do not have access to this ride', 403, 'forbidden'));
    }

    const payload = await parseJsonBody(request, messageSchema);
    const event = await prisma.rideEvent.create({
      data: {
        rideId,
        type: 'ride.chat.message',
        payload: {
          senderId: session.userId,
          senderName: session.name,
          role: session.role,
          message: payload.message
        }
      }
    });

    await recordAuditLog({
      actorUserId: session.userId,
      action: 'ride.chat.message',
      entityType: 'Ride',
      entityId: rideId,
      payload: {
        message: payload.message
      }
    });

    return jsonSuccess({
      message: {
        id: event.id,
        rideId: event.rideId,
        senderId: session.userId,
        senderName: session.name,
        role: session.role,
        message: payload.message,
        createdAt: event.createdAt.toISOString()
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
