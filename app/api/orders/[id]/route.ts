export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { invalidateOrdersCache, invalidateOrderStatsCache } from '@/lib/cache';
import { sanitizeMongoObject } from '@/lib/security';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'] as const;
const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;
type RouteContext = { params: Promise<{ id: string }> };

export const GET = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
    await dbConnect();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID заказа обязателен' }, { status: 400 });
    }

    const order = await Order.findById(id).populate('items.productId', 'name price image description');
    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const userRole = request.headers.get('x-user-role');
    const userEmail = request.headers.get('x-username');
    if (userRole !== 'admin' && order.customer.email !== userEmail) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    return NextResponse.json({ order }, { status: 200 });
  
});

export const PATCH = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
    await dbConnect();
    const { id } = await context.params;
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен - требуется роль администратора' }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID заказа обязателен' }, { status: 400 });
    }

    const body = sanitizeMongoObject(await request.json());
    const updateData: Record<string, unknown> = {};

    if (ORDER_STATUSES.includes(body.status as any)) updateData.status = body.status;
    if (PAYMENT_STATUSES.includes(body.paymentStatus as any)) updateData.paymentStatus = body.paymentStatus;
    if (typeof body.notes === 'string') updateData.notes = body.notes.slice(0, 500);
    if (typeof body.deliveryTime === 'string') updateData.deliveryTime = body.deliveryTime.slice(0, 50);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Нет допустимых полей для обновления' }, { status: 400 });
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).populate(
      'items.productId',
      'name price image'
    );

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    invalidateOrdersCache();
    invalidateOrderStatsCache();

    return NextResponse.json({ order: updatedOrder }, { status: 200 });
  
});

export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
    await dbConnect();
    const { id } = await context.params;
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен - требуется роль администратора' }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID заказа обязателен' }, { status: 400 });
    }

    const deletedOrder = await Order.findByIdAndDelete(id);
    if (!deletedOrder) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    invalidateOrdersCache();
    invalidateOrderStatsCache();

    return NextResponse.json({ message: 'Заказ успешно удален', orderNumber: deletedOrder.orderNumber }, { status: 200 });
  
});
