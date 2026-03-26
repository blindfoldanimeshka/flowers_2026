export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';

// GET запрос для получения новых заказов после указанной даты (для polling)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since'); // ISO timestamp
    const deliveryType = searchParams.get('deliveryType'); // Фильтр по типу доставки
    const userRole = request.headers.get('x-user-role');
    
    // Только админы могут получать уведомления о новых заказах
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен - требуется роль администратора' },
        { status: 403 }
      );
    }
    
    const query: any = {};
    
    // Если указан timestamp, получаем заказы после этой даты
    if (since) {
      query.createdAt = { $gt: new Date(since) };
    }
    
    // Добавляем фильтр по типу доставки
    if (deliveryType) {
      query.fulfillmentMethod = deliveryType;
    }
    
    const newOrders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('items.productId', 'name price image');
    
    // Возвращаем количество новых заказов и сами заказы
    return NextResponse.json({
      count: newOrders.length,
      orders: newOrders,
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Ошибка при получении новых заказов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении новых заказов', details: error.message },
      { status: 500 }
    );
  }
} 