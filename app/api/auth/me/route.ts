export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// GET запрос для получения информации о текущем пользователе
export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');
    const username = request.headers.get('x-username');
    
    // Если нет данных о пользователе, возвращаем 401
    if (!userRole || !username) {
      return NextResponse.json(
        { error: 'Пользователь не авторизован' },
        { status: 401 }
      );
    }
    
    // Возвращаем информацию о пользователе
    return NextResponse.json({
      username,
      role: userRole,
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Ошибка при получении информации о пользователе:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error.message },
      { status: 500 }
    );
  }
} 