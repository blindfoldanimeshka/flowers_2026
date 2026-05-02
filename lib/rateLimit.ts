import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

function createRateLimiter(config: RateLimitConfig): Ratelimit {
  const windowSeconds = Math.floor(config.windowMs / 1000);
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${windowSeconds} s`),
    prefix: 'ratelimit',
  });
}

const rateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
});

export async function isAllowed(identifier: string): Promise<boolean> {
  const { success } = await rateLimiter.limit(identifier);
  return success;
}

export async function getRemaining(identifier: string): Promise<number> {
  const { remaining } = await rateLimiter.limit(identifier);
  return remaining;
}

export async function getResetTime(identifier: string): Promise<number> {
  const { reset } = await rateLimiter.limit(identifier);
  return reset * 1000;
}

export default { isAllowed, getRemaining, getResetTime };