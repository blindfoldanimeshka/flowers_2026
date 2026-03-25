import { NextRequest } from 'next/server';

// Интерфейс для метрик производительности
interface PerformanceMetrics {
  timestamp: number;
  endpoint: string;
  method: string;
  responseTime: number;
  cacheHit: boolean;
  statusCode: number;
  userAgent?: string;
  ip?: string;
}

// Класс для мониторинга производительности
class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000; // Максимальное количество метрик в памяти

  // Запись метрики
  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Ограничиваем количество метрик в памяти
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Получение статистики производительности
  getStats() {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        statusCodes: {},
        topEndpoints: []
      };
    }

    const totalRequests = this.metrics.length;
    const totalResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = totalResponseTime / totalRequests;
    
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalRequests) * 100;

    // Статистика по статус кодам
    const statusCodes: Record<number, number> = {};
    this.metrics.forEach(m => {
      statusCodes[m.statusCode] = (statusCodes[m.statusCode] || 0) + 1;
    });

    // Топ эндпоинтов по количеству запросов
    const endpointCounts: Record<string, number> = {};
    this.metrics.forEach(m => {
      endpointCounts[m.endpoint] = (endpointCounts[m.endpoint] || 0) + 1;
    });

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      statusCodes,
      topEndpoints
    };
  }

  // Получение метрик за последние N минут
  getRecentMetrics(minutes: number = 60) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  // Очистка старых метрик
  cleanup() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
  }
}

// Глобальный экземпляр монитора
export const performanceMonitor = new PerformanceMonitor();

// Middleware для автоматического мониторинга
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  endpoint: string
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    let cacheHit = false;
    let statusCode = 200;

    try {
      const result = await fn(...args);
      
      // Проверяем, был ли использован кэш (если результат содержит информацию о кэше)
      if (result && typeof result === 'object' && 'cached' in result) {
        cacheHit = result.cached as boolean;
      }

      return result;
    } catch (error: any) {
      statusCode = error.statusCode || 500;
      throw error;
    } finally {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      performanceMonitor.recordMetric({
        timestamp: startTime,
        endpoint,
        method: 'GET', // По умолчанию, можно улучшить
        responseTime,
        cacheHit,
        statusCode
      });
    }
  }) as T;
}

// Утилита для извлечения информации о запросе
export function extractRequestInfo(request: NextRequest) {
  return {
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'unknown'
  };
}

// Утилита для логирования производительности
export function logPerformance(endpoint: string, responseTime: number, cacheHit: boolean, statusCode: number) {
  const level = responseTime > 1000 ? 'warn' : 'info';
  const cacheStatus = cacheHit ? '[CACHE HIT]' : '[CACHE MISS]';
  
  console[level](`${cacheStatus} ${endpoint} - ${responseTime}ms - ${statusCode}`);
}

// Автоматическая очистка метрик каждый час
if (typeof window === 'undefined') {
  setInterval(() => {
    performanceMonitor.cleanup();
  }, 60 * 60 * 1000); // Каждый час
} 