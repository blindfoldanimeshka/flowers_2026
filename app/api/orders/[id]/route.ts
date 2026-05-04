export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase, SUPABASE_COLLECTION_TABLE } from '@/lib/supabase';
import { invalidateOrdersCache, invalidateOrderStatsCache } from '@/lib/cache';
import { sanitizeMongoObject } from '@/lib/security';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'] as const;
const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;
const ORDERS_COLLECTION = 5;
type RouteContext = { params: Promise<{ id: string }> };

function mapOrderRow(row: any) {
  const doc = typeof row.doc === 'string' ? JSON.parse(row.doc) : row.doc;
  return {
    _id: row.id,
    ...doc,
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
      .from(SUPABASE_COLLECTION_TABLE)
      .select('id, doc, created_at, updated_at')
      .eq('collection', ORDERS_COLLECTION)
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const orderData = mapOrderRow(order);

    const userRole = request.headers.get('x-user-role');
    const userEmail = request.headers.get('x-username');
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

    // First, get the current order
    const { data: currentOrder, error: fetchError } = await supabase
      .from(SUPABASE_COLLECTION_TABLE)
      .select('id, doc, created_at, updated_at')
      .eq('collection', ORDERS_COLLECTION)
      .eq('id', id)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const currentDoc = typeof currentOrder.doc === 'string' ? JSON.parse(currentOrder.doc) : currentOrder.doc;
    const body = sanitizeMongoObject(await request.json());
    const updateData: Record<string, unknown> = {};

    if (ORDER_STATUSES.includes(body.status as any)) updateData.status = body.status;
    if (PAYMENT_STATUSES.includes(body.paymentStatus as any)) updateData.paymentStatus = body.paymentStatus;
    if (typeof body.notes === 'string') updateData.notes = body.notes.slice(0, 500);
    if (typeof body.deliveryTime === 'string') updateData.deliveryTime = body.deliveryTime.slice(0, 50);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Нет допустимых полей для обновления' }, { status: 400 });
    }

    // Merge updates into doc
    const updatedDoc = { ...currentDoc, ...updateData };

    const { data: updatedOrder, error: updateError } = await supabase
      .from(SUPABASE_COLLECTION_TABLE)
      .update({ doc: updatedDoc })
      .eq('collection', ORDERS_COLLECTION)
      .eq('id', id)
      .select('id, doc, created_at, updated_at')
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

    // First get the order to return orderNumber
    const { data: orderToDelete, error: fetchError } = await supabase
      .from(SUPABASE_COLLECTION_TABLE)
      .select('id, doc')
      .eq('collection', ORDERS_COLLECTION)
      .eq('id', id)
      .single();

    if (fetchError || !orderToDelete) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const doc = typeof orderToDelete.doc === 'string' ? JSON.parse(orderToDelete.doc) : orderToDelete.doc;

    // Delete the order
    const { error: deleteError } = await supabase
      .from(SUPABASE_COLLECTION_TABLE)
      .delete()
      .eq('collection', ORDERS_COLLECTION)
      .eq('id', id);

    if (deleteError) {
      console.error('[ORDERS/[ID]] Supabase delete error:', { message: deleteError.message, code: deleteError.code });
      return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
    }

    invalidateOrdersCache();
    invalidateOrderStatsCache();

    return NextResponse.json({ message: 'Заказ успешно удален', orderNumber: doc.orderNumber }, { status: 200 });
  
});
