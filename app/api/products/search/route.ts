export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';

export async function GET(request: NextRequest) {
  try {
    await connect();
    
    // Получаем поисковый запрос из URL параметров
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    
    // Проверяем наличие поискового запроса
    if (!query) {
      return NextResponse.json(
        { error: 'Поисковый запрос не указан' },
        { status: 400 }
      );
    }
    
    // Ищем товары по названию (регистронезависимый поиск)
    const products = await Product.find({
      title: { $regex: query, $options: 'i' }
    });
    
    return NextResponse.json({ products }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при поиске товаров:', error);
    return NextResponse.json(
      { error: 'Ошибка при поиске товаров', details: error.message },
      { status: 500 }
    );
  }
}