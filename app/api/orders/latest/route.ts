export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withErrorHandler } from '@/lib/errorHandler';

function mapOrderRow(row: any) {
  const items = Array.isArray(row.order_items) ? row.order_items : [];
  return {
    _id: row.id,
    orderNumber: row.order_number,
    customer: {
      name: row.customer_name,
      email: row.customer_email || undefined,
      phone: row.customer_phone,
      address: row.customer_address,
    },
    items: items.map((item: any) => ({
      productId: item.product_id || '',
      quantity: item.quantity,
      name: item.product_name,
      price: Number(item.price) || 0,
      image: item.image_url || '',
    })),
    paymentMethod: row.payment_method,
    fulfillmentMethod: row.fulfillment_method,
    deliveryDate: row.delivery_date || undefined,
    deliveryTime: row.delivery_time || undefined,
    notes: row.notes || undefined,
    totalAmount: Number(row.total_amount) || 0,
    status: row.status,
    paymentStatus: row.payment_status,
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

    let query = supabase.from('orders').select(
      `
        id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        status,
        payment_method,
        fulfillment_method,
        delivery_date,
        delivery_time,
        notes,
        total_amount,
        payment_status,
        created_at,
        updated_at,
        order_items (
          product_id,
          product_name,
          price,
          quantity,
          image_url
        )
      `
    );

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
      query = query.eq('fulfillment_method', deliveryType);
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
