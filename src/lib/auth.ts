import bcrypt from 'bcryptjs';
import type { DriverProfile, User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { userRoles, type UserRole } from '@/lib/roles';
import { serializeUser, type SafeUser } from '@/lib/serializers';
import { signSession, buildSessionCookie, sessionFromSafeUser } from '@/lib/session';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { driverProfile: true }
  });
}

export function sanitizeUser(user: User & { driverProfile?: DriverProfile | null }): SafeUser {
  return serializeUser(user);
}

export async function createUser(input: RegisterInput) {
  if (!userRoles.includes(input.role ?? 'RIDER')) {
    throw new AppError('Invalid role', 400, 'invalid_role');
  }

  const normalizedEmail = input.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existing) {
    throw new AppError('An account with that email already exists', 409, 'email_exists');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: normalizedEmail,
      passwordHash,
      preferredLanguage: 'en',
      role: input.role ?? 'RIDER',
      driverProfile:
        input.role === 'DRIVER'
          ? {
              create: {
                vehicleColor: null,
                commissionBps: 1200,
                isAvailable: false,
                serviceRadiusKm: 25
              }
            }
          : undefined
    },
    include: { driverProfile: true }
  });

  return sanitizeUser(user);
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { driverProfile: true }
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'invalid_credentials');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401, 'invalid_credentials');
  }

  const safeUser = sanitizeUser(user);
  const session = sessionFromSafeUser(safeUser);
  const token = await signSession(session);
  const cookie = buildSessionCookie(token);

  return { safeUser, cookie };
}

export function safeUserToSession(user: SafeUser) {
  return sessionFromSafeUser(user);
}

export async function ensureUserExists(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { driverProfile: true }
  });

  if (!user) {
    throw new AppError('User not found', 404, 'user_not_found');
  }

  return sanitizeUser(user);
}

export async function updateDriverAvailability(userId: string, isAvailable: boolean) {
  return prisma.driverProfile.upsert({
    where: { userId },
    update: { isAvailable },
    create: { userId, isAvailable }
  });
}
