import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance';
import { requireAdmin } from '@/lib/auth';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

// GET - получение метрик производительности
export const GET = withErrorHandler(async (request: NextRequest) => {
    // Проверяем права администратора
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Получаем параметры запроса
    const { searchParams } = new URL(request.url);
    const minutes = parseInt(searchParams.get('minutes') || '60');
    const includeMetrics = searchParams.get('includeMetrics') === 'true';

    // Получаем статистику
    const stats = performanceMonitor.getStats();
    
    // Получаем детальные метрики если запрошено
    const recentMetrics = includeMetrics ? performanceMonitor.getRecentMetrics(minutes) : [];

    return NextResponse.json({
      success: true,
      stats,
      recentMetrics: includeMetrics ? recentMetrics : undefined,
      timestamp: new Date().toISOString()
    });

  
});

// DELETE - очистка метрик
export const DELETE = withErrorHandler(async (request: NextRequest) => {
    // Проверяем права администратора
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Очищаем метрики
    performanceMonitor.cleanup();

    return NextResponse.json({
      success: true,
      message: 'Метрики очищены'
    });

  
}); 