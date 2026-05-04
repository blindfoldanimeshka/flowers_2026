import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface TelegramRateLimiterConfig {
  maxNotifications: number;
  windowMs: number;
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const hasRedisConfig = Boolean(redisUrl && redisToken);
const redis = hasRedisConfig ? new Redis({ url: redisUrl!, token: redisToken! }) : null;

class TelegramRateLimiter {
  private readonly limiter: Ratelimit | null;
  private readonly config: TelegramRateLimiterConfig;
  private fallbackState: { count: number; resetAt: number } = { count: 0, resetAt: 0 };

  constructor(config: TelegramRateLimiterConfig) {
    if (redis) {
      const windowSeconds = Math.floor(config.windowMs / 1000);
      this.limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.maxNotifications, `${windowSeconds} s`),
        prefix: 'telegram-notify',
      });
    } else {
      this.limiter = null;
    }
    this.config = config;
  }

  async canSend(): Promise<boolean> {
    const { success } = this.limiter ? await this.limiter.limit('telegram-notifications') : this.limitInMemory();
    return success;
  }

  async getStats() {
    const { remaining, reset } = this.limiter ? await this.limiter.limit('telegram-notifications') : this.limitInMemory();
    return {
      sent: this.config.maxNotifications - remaining,
      remaining,
      limit: this.config.maxNotifications,
      windowMs: this.config.windowMs,
      resetTime: reset * 1000,
    };
  }

  private limitInMemory() {
    const now = Date.now();
    if (this.fallbackState.resetAt <= now) {
      this.fallbackState = { count: 1, resetAt: now + this.config.windowMs };
      return {
        success: true,
        remaining: this.config.maxNotifications - 1,
        reset: Math.floor(this.fallbackState.resetAt / 1000),
      };
    }

    this.fallbackState.count += 1;
    const remaining = Math.max(0, this.config.maxNotifications - this.fallbackState.count);
    return {
      success: this.fallbackState.count <= this.config.maxNotifications,
      remaining,
      reset: Math.floor(this.fallbackState.resetAt / 1000),
    };
  }
}

export const telegramRateLimiter = new TelegramRateLimiter({
  maxNotifications: 20,
  windowMs: 60 * 1000,
});
