import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const hasRedisConfig = Boolean(redisUrl && redisToken);
const redis = hasRedisConfig ? new Redis({ url: redisUrl!, token: redisToken! }) : null;

function createRateLimiter(config: RateLimitConfig): Ratelimit {
  const windowSeconds = Math.floor(config.windowMs / 1000);
  if (!redis) {
    throw new Error('Upstash Redis is not configured');
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${windowSeconds} s`),
    prefix: 'ratelimit',
  });
}

const rateLimiter = hasRedisConfig
  ? createRateLimiter({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    })
  : null;

const fallbackHits = new Map<string, { count: number; resetAt: number }>();
const fallbackWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
const fallbackMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

function limitInMemory(identifier: string) {
  const now = Date.now();
  const state = fallbackHits.get(identifier);

  if (!state || state.resetAt <= now) {
    const next = { count: 1, resetAt: now + fallbackWindowMs };
    fallbackHits.set(identifier, next);
    return { success: true, remaining: fallbackMaxRequests - 1, reset: Math.floor(next.resetAt / 1000) };
  }

  state.count += 1;
  fallbackHits.set(identifier, state);
  const remaining = Math.max(0, fallbackMaxRequests - state.count);
  return { success: state.count <= fallbackMaxRequests, remaining, reset: Math.floor(state.resetAt / 1000) };
}

export async function isAllowed(identifier: string): Promise<boolean> {
  const { success } = hasRedisConfig && rateLimiter ? await rateLimiter.limit(identifier) : limitInMemory(identifier);
  return success;
}

export async function getRemaining(identifier: string): Promise<number> {
  const { remaining } = hasRedisConfig && rateLimiter ? await rateLimiter.limit(identifier) : limitInMemory(identifier);
  return remaining;
}

export async function getResetTime(identifier: string): Promise<number> {
  const { reset } = hasRedisConfig && rateLimiter ? await rateLimiter.limit(identifier) : limitInMemory(identifier);
  return reset * 1000;
}

export default { isAllowed, getRemaining, getResetTime };
