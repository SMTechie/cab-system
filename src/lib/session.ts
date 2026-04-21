import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import type { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { sessionCookieName } from '@/lib/constants';
import { getCookieValue } from '@/lib/cookies';
import { AppError } from '@/lib/errors';
import { hasRole, type UserRole } from '@/lib/roles';
import type { SafeUser } from '@/lib/serializers';

const secret = new TextEncoder().encode(env.AUTH_SECRET);

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface SessionCookieOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

export async function signSession(user: SessionUser) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.name !== 'string' || typeof payload.role !== 'string') {
      return null;
    }

    if (!hasRole(payload.role as UserRole, ['RIDER', 'DRIVER', 'ADMIN'])) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role as UserRole
    };
  } catch {
    return null;
  }
}

export function buildSessionCookie(token: string): SessionCookieOptions {
  return {
    name: sessionCookieName,
    value: token,
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  };
}

export function buildClearedSessionCookie(): SessionCookieOptions {
  return {
    ...buildSessionCookie(''),
    value: '',
    maxAge: 0
  };
}

export async function getSessionFromHeaders(cookieHeader: string | null | undefined) {
  const token = getCookieValue(cookieHeader, sessionCookieName);
  if (!token) return null;
  return verifySession(token);
}

export async function getSessionFromRequest(request?: Request) {
  if (!request) return null;
  return getSessionFromHeaders(request.headers.get('cookie'));
}

export async function getCurrentSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) {
    throw new AppError('Authentication required', 401, 'unauthorized');
  }
  return session;
}

export async function requireRole(allowed: readonly UserRole[]) {
  const session = await requireSession();
  if (!hasRole(session.role, allowed)) {
    throw new AppError('You do not have access to this resource', 403, 'forbidden');
  }
  return session;
}

export function sessionFromSafeUser(user: SafeUser): SessionUser {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole
  };
}

export function requestOrigin(request?: Request) {
  if (!request) {
    const headerStore = headers();
    return headerStore.get('origin') ?? env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  }
  return new URL(request.url).origin;
}

export function applySessionCookie(response: NextResponse, cookie: SessionCookieOptions) {
  response.cookies.set({
    name: cookie.name,
    value: cookie.value,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    path: cookie.path,
    maxAge: cookie.maxAge
  });
  return response;
}
