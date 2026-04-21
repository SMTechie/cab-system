import { NextResponse } from 'next/server';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';

export function jsonSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function jsonError(error: unknown, fallbackMessage = 'Something went wrong') {
  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          details: error.details ?? null
        }
      },
      { status: error.status }
    );
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json(
    {
      error: {
        message,
        code: 'internal_error'
      }
    },
    { status: 500 }
  );
}

export async function resolveApi<T>(handler: () => Promise<T>) {
  try {
    return jsonSuccess(await handler());
  } catch (error) {
    return jsonError(error);
  }
}

export function assertNever(value: never): never {
  throw new AppError(`Unhandled value: ${String(value)}`, 500, 'unhandled_value');
}
