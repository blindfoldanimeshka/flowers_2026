import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface TelegramRateLimiterConfig {
  maxNotifications: number;
  windowMs: number;
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

class TelegramRateLimiter {
  private readonly limiter: Ratelimit;
  private readonly config: TelegramRateLimiterConfig;

  constructor(config: TelegramRateLimiterConfig) {
    const windowSeconds = Math.floor(config.windowMs / 1000);
    this.limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.maxNotifications, `${windowSeconds} s`),
      prefix: 'telegram-notify',
    });
    this.config = config;
  }

  async canSend(): Promise<boolean> {
    const { success } = await this.limiter.limit('telegram-notifications');
    return success;
  }

  async getStats() {
    const { remaining, reset } = await this.limiter.limit('telegram-notifications');
    return {
      sent: this.config.maxNotifications - remaining,
      remaining,
      limit: this.config.maxNotifications,
      windowMs: this.config.windowMs,
      resetTime: reset * 1000,
    };
  }
}

export const telegramRateLimiter = new TelegramRateLimiter({
  maxNotifications: 20,
  windowMs: 60 * 1000,
});