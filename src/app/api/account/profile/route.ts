import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { getSessionFromRequest, signSession, buildSessionCookie, applySessionCookie, sessionFromSafeUser } from '@/lib/session';
import { parseJsonBody } from '@/lib/request';
import { accountProfileSchema } from '@/lib/validators';
import { serializeUser } from '@/lib/serializers';

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { driverProfile: true }
    });

    if (!user) {
      throw new AppError('User not found', 404, 'user_not_found');
    }

    return jsonSuccess({ user: serializeUser(user) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const payload = await parseJsonBody(request, accountProfileSchema);
    const current = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { driverProfile: true }
    });

    if (!current) {
      throw new AppError('User not found', 404, 'user_not_found');
    }

    if (payload.email && payload.email.toLowerCase().trim() !== current.email) {
      const conflict = await prisma.user.findUnique({
        where: { email: payload.email.toLowerCase().trim() }
      });

      if (conflict && conflict.id !== current.id) {
        throw new AppError('An account with that email already exists', 409, 'email_exists');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: current.id },
        data: {
          ...(payload.name ? { name: payload.name.trim() } : {}),
          ...(payload.email ? { email: payload.email.toLowerCase().trim() } : {}),
          ...(payload.phoneNumber !== undefined ? { phoneNumber: payload.phoneNumber?.trim() || null } : {}),
          ...(payload.preferredLanguage ? { preferredLanguage: payload.preferredLanguage.trim().toLowerCase() } : {})
        },
        include: { driverProfile: true }
      });

      if (session.role === UserRole.DRIVER || user.role === UserRole.DRIVER) {
        await tx.driverProfile.upsert({
          where: { userId: user.id },
          update: {
            ...(payload.vehicleMake !== undefined ? { vehicleMake: payload.vehicleMake?.trim() || null } : {}),
            ...(payload.vehicleModel !== undefined ? { vehicleModel: payload.vehicleModel?.trim() || null } : {}),
            ...(payload.vehicleColor !== undefined ? { vehicleColor: payload.vehicleColor?.trim() || null } : {}),
            ...(payload.plateNumber !== undefined ? { plateNumber: payload.plateNumber?.trim() || null } : {}),
            ...(payload.serviceRadiusKm !== undefined ? { serviceRadiusKm: payload.serviceRadiusKm } : {}),
            ...(typeof payload.isAvailable === 'boolean' ? { isAvailable: payload.isAvailable } : {})
          },
          create: {
            userId: user.id,
            vehicleMake: payload.vehicleMake?.trim() || null,
            vehicleModel: payload.vehicleModel?.trim() || null,
            vehicleColor: payload.vehicleColor?.trim() || null,
            plateNumber: payload.plateNumber?.trim() || null,
            serviceRadiusKm: payload.serviceRadiusKm ?? 25,
            isAvailable: payload.isAvailable ?? false
          }
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        include: { driverProfile: true }
      });
    });

    if (!updated) {
      throw new AppError('Unable to update profile', 500, 'profile_update_failed');
    }

    const safeUser = serializeUser(updated);
    const response = jsonSuccess({ user: safeUser });
    const sessionToken = await signSession(sessionFromSafeUser(safeUser));
    applySessionCookie(response, buildSessionCookie(sessionToken));
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
