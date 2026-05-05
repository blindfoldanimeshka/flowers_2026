export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { invalidateOrdersCache, invalidateOrderStatsCache } from '@/lib/cache';
import { sanitizeMongoObject } from '@/lib/security';
import { withErrorHandler } from '@/lib/errorHandler';

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'] as const;
const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;
type RouteContext = { params: Promise<{ id: string }> };

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

export const GET = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID заказа обязателен' }, { status: 400 });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select(
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
      )
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const orderData = mapOrderRow(order);

    const userRole = request.headers.get('x-user-role');
    const userEmail = request.headers.get('x-user-email') || request.headers.get('x-username');
    if (userRole !== 'admin' && orderData.customer?.email !== userEmail) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    return NextResponse.json({ order: orderData }, { status: 200 });
  
});

export const PATCH = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен - требуется роль администратора' }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID заказа обязателен' }, { status: 400 });
    }

    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const body = sanitizeMongoObject(await request.json());
    const updateData: Record<string, unknown> = {};

    if (ORDER_STATUSES.includes(body.status as any)) updateData.status = body.status;
    if (PAYMENT_STATUSES.includes(body.paymentStatus as any)) updateData.payment_status = body.paymentStatus;
    if (typeof body.notes === 'string') updateData.notes = body.notes.slice(0, 500);
    if (typeof body.deliveryTime === 'string') updateData.delivery_time = body.deliveryTime.slice(0, 50);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Нет допустимых полей для обновления' }, { status: 400 });
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select(
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
      )
      .single();

    if (updateError) {
      console.error('[ORDERS/[ID]] Supabase update error:', { message: updateError.message, code: updateError.code });
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    invalidateOrdersCache();
    invalidateOrderStatsCache();

    const orderResponse = mapOrderRow(updatedOrder);
    return NextResponse.json({ order: orderResponse }, { status: 200 });
  
});

export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен - требуется роль администратора' }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID заказа обязателен' }, { status: 400 });
    }

    const { data: orderToDelete, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('id', id)
      .single();

    if (fetchError || !orderToDelete) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[ORDERS/[ID]] Supabase delete error:', { message: deleteError.message, code: deleteError.code });
      return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
    }

    invalidateOrdersCache();
    invalidateOrderStatsCache();

    return NextResponse.json({ message: 'Заказ успешно удален', orderNumber: orderToDelete.order_number }, { status: 200 });
  
});
