import { AppError } from '@/lib/errors';
import { env } from '@/lib/env';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

export function getRequestFingerprint(request: Request, fallback = 'anonymous') {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || fallback;
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `${ip}:${userAgent}`;
}

export function assertRateLimit(key: string, limit = env.RATE_LIMIT_MAX_REQUESTS, windowMs = env.RATE_LIMIT_WINDOW_MS) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return;
  }

  if (bucket.count >= limit) {
    throw new AppError('Too many requests', 429, 'rate_limited');
  }

  bucket.count += 1;
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
