export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCachedOrderStats } from '@/lib/cache';

// GET запрос для получения статистики (с кэшированием)
export async function GET(request: NextRequest) {
  try {
    // Получаем информацию о пользователе из middleware
    const userRole = request.headers.get('x-user-role');
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен - требуется роль администратора' },
        { status: 403 }
      );
    }

    console.log('Получение статистики из кэша...');
    
    // Получаем статистику из кэша
    const stats = await getCachedOrderStats();
    
    console.log('Статистика получена из кэша');
    
    return NextResponse.json({ stats }, { status: 200 });
    
  } catch (error: any) {
    console.error('Ошибка при получении статистики:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении статистики', details: error.message },
      { status: 500 }
    );
  }
} 