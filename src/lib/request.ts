import { z, type ZodTypeAny } from 'zod';
import { AppError } from '@/lib/errors';

export async function parseJsonBody<TSchema extends ZodTypeAny>(request: Request, schema: TSchema) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new AppError('Request body must be valid JSON', 400, 'invalid_json');
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError('Request validation failed', 422, 'validation_error', result.error.flatten());
  }

  return result.data as z.infer<TSchema>;
}

export function parseSearchParams(request: Request) {
  return new URL(request.url).searchParams;
}
