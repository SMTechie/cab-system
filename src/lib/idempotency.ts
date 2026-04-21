import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';

export interface IdempotentRouteResult<T> {
  result: T;
  replayed: boolean;
}

export async function runIdempotent<T extends Prisma.InputJsonValue>(
  route: string,
  key: string | null,
  userId: string | null | undefined,
  handler: () => Promise<T>
): Promise<IdempotentRouteResult<T>> {
  if (!key) {
    return {
      result: await handler(),
      replayed: false
    };
  }

  const existing = await prisma.idempotencyKey.findUnique({
    where: { key }
  });

  if (existing && existing.route === route && existing.userId === (userId ?? null) && existing.response) {
    return {
      result: existing.response as T,
      replayed: true
    };
  }

  if (existing && (existing.route !== route || existing.userId !== (userId ?? null))) {
    throw new AppError('Idempotency key already used for a different request', 409, 'idempotency_conflict');
  }

  const result = await handler();

  await prisma.idempotencyKey.upsert({
    where: { key },
    update: {
      route,
      userId: userId ?? null,
      response: result as Prisma.InputJsonValue
    },
    create: {
      key,
      route,
      userId: userId ?? null,
      response: result as Prisma.InputJsonValue
    }
  });

  return {
    result,
    replayed: false
  };
}
