export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCachedOrderStats } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

// GET запрос для получения статистики (с кэшированием)
export const GET = withErrorHandler(async (request: NextRequest) => {
    // Получаем информацию о пользователе из middleware
    const userRole = request.headers.get('x-user-role');
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен - требуется роль администратора' },
        { status: 403 }
      );
    }

    productionLogger.info('Получение статистики из кэша...');
    
    // Получаем статистику из кэша
    const stats = await getCachedOrderStats();
    
    productionLogger.info('Статистика получена из кэша');
    
    return NextResponse.json({ stats }, { status: 200 });
    
  
}); 