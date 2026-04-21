export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

// GET запрос для получения новых заказов после указанной даты (для polling)
export const GET = withErrorHandler(async (request: NextRequest) => {
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
      const parsedSince = new Date(since);
      if (Number.isNaN(parsedSince.getTime())) {
        return NextResponse.json({ error: 'Некорректный параметр since' }, { status: 400 });
      }
      query.createdAt = { $gt: parsedSince };
    }
    
    // Добавляем фильтр по типу доставки
    if (deliveryType) {
      if (deliveryType !== 'delivery' && deliveryType !== 'pickup') {
        return NextResponse.json({ error: 'Некорректный параметр deliveryType' }, { status: 400 });
      }
      query.fulfillmentMethod = deliveryType;
    }
    
    // For notifications we already store item snapshots in each order (name/price/image),
    // so avoid expensive populate calls that can fail on transient upstream issues.
    const newOrders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Возвращаем количество новых заказов и сами заказы
    return NextResponse.json({
      count: newOrders.length,
      orders: newOrders,
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  
}); 
