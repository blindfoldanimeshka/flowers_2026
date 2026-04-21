interface TelegramRateLimiterConfig {
  maxNotifications: number;
  windowMs: number;
}

interface NotificationRecord {
  timestamp: number;
}

class TelegramRateLimiter {
  private notifications: NotificationRecord[] = [];
  private readonly config: TelegramRateLimiterConfig;

  constructor(config: TelegramRateLimiterConfig) {
    this.config = config;
  }

  canSend(): boolean {
    this.cleanup();
    return this.notifications.length < this.config.maxNotifications;
  }

  recordSent(): void {
    this.notifications.push({ timestamp: Date.now() });
  }

  getStats() {
    this.cleanup();
    return {
      sent: this.notifications.length,
      remaining: this.config.maxNotifications - this.notifications.length,
      limit: this.config.maxNotifications,
      windowMs: this.config.windowMs,
    };
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.notifications = this.notifications.filter((record) => record.timestamp > cutoff);
  }
}

export const telegramRateLimiter = new TelegramRateLimiter({
  maxNotifications: 20,
  windowMs: 60 * 1000,
});

