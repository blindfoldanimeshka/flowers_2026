export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase, SUPABASE_COLLECTION_TABLE } from '@/lib/supabase';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

const ORDERS_COLLECTION = 5;

function mapOrderRow(row: any) {
  const doc = typeof row.doc === 'string' ? JSON.parse(row.doc) : row.doc;
  return {
    _id: row.id,
    ...doc,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET запрос для получения новых заказов после указанной даты (для polling)
export const GET = withErrorHandler(async (request: NextRequest) => {
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

    let query = supabase
      .from(SUPABASE_COLLECTION_TABLE)
      .select('id, doc, created_at, updated_at')
      .eq('collection', ORDERS_COLLECTION);

    // Если указан timestamp, получаем заказы после этой даты
    if (since) {
      const parsedSince = new Date(since);
      if (Number.isNaN(parsedSince.getTime())) {
        return NextResponse.json({ error: 'Некорректный параметр since' }, { status: 400 });
      }
      query = query.gt('created_at', parsedSince.toISOString());
    }

    // Добавляем фильтр по типу доставки
    if (deliveryType) {
      if (deliveryType !== 'delivery' && deliveryType !== 'pickup') {
        return NextResponse.json({ error: 'Некорректный параметр deliveryType' }, { status: 400 });
      }
      query = query.eq('doc->>fulfillmentMethod', deliveryType);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[ORDERS_LATEST] Supabase error:', { message: error.message, code: error.code });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const orders = (data || []).map(mapOrderRow);

    // Возвращаем количество новых заказов и сами заказы
    return NextResponse.json({
      count: orders.length,
      orders: orders,
      timestamp: new Date().toISOString()
    }, { status: 200 });

}); 
