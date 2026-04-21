export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import { getCachedOrders, invalidateOrdersCache, invalidateOrderStatsCache } from '@/lib/cache';
import { sanitizeMongoObject, toIntInRange } from '@/lib/security';
import { sendOrderNotification } from '@/lib/telegram';
import { telegramRateLimiter } from '@/lib/telegram/rateLimiter';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'] as const;
const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;
const FULFILLMENT_TYPES = ['delivery', 'pickup'] as const;
const PAYMENT_METHODS = ['cash', 'card', 'online'] as const;

export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') ?? undefined;
    const statusParam = searchParams.get('status') ?? undefined;
    const deliveryTypeParam = searchParams.get('deliveryType') ?? undefined;

    const status = ORDER_STATUSES.includes(statusParam as any) ? statusParam : undefined;
    const deliveryType = FULFILLMENT_TYPES.includes(deliveryTypeParam as any) ? deliveryTypeParam : undefined;
    const page = toIntInRange(searchParams.get('page'), 1, 1, 1000);
    const limit = toIntInRange(searchParams.get('limit'), 10, 1, 100);

    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin' && !email) {
      return NextResponse.json({ error: 'Email обязателен для получения заказов клиента' }, { status: 400 });
    }

    const result = await getCachedOrders({ email, status, deliveryType, page, limit });
    return NextResponse.json(result, { status: 200 });
  
});

export const POST = withErrorHandler(async (request: NextRequest) => {
    await dbConnect();
    const body = sanitizeMongoObject(await request.json());

    const customer = body.customer as { name?: string; phone?: string; email?: string; address?: string } | undefined;
    const items = Array.isArray(body.items) ? body.items : [];
    const paymentMethod = body.paymentMethod;
    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : undefined;
    const fulfillmentMethod = body.fulfillmentMethod || body.deliveryType;

    if (!PAYMENT_METHODS.includes(paymentMethod as any) || !FULFILLMENT_TYPES.includes(fulfillmentMethod as any) || items.length === 0) {
      return NextResponse.json({ error: 'Некорректные данные для создания заказа' }, { status: 400 });
    }

    if (
      !customer ||
      typeof customer.name !== 'string' ||
      typeof customer.phone !== 'string' ||
      typeof customer.address !== 'string' ||
      !customer.name.trim() ||
      !customer.phone.trim() ||
      !customer.address.trim()
    ) {
      return NextResponse.json({ error: 'Некорректные данные клиента' }, { status: 400 });
    }

    let totalAmount = 0;
    const orderItems: Array<{ productId: string; quantity: number; name: string; price: number; image: string }> = [];

    for (const rawItem of items as Array<{ productId?: string | number; quantity?: number }>) {
      const normalizedProductId =
        typeof rawItem.productId === 'string'
          ? rawItem.productId.trim()
          : typeof rawItem.productId === 'number' && Number.isFinite(rawItem.productId)
            ? String(rawItem.productId)
            : '';

      if (
        !normalizedProductId ||
        typeof rawItem.quantity !== 'number' ||
        !Number.isInteger(rawItem.quantity) ||
        rawItem.quantity <= 0 ||
        rawItem.quantity > 100
      ) {
        return NextResponse.json({ error: 'Некорректные позиции заказа' }, { status: 400 });
      }

      const product = await Product.findById(normalizedProductId);
      if (!product) {
        return NextResponse.json({ error: `Товар с ID ${normalizedProductId} не найден` }, { status: 404 });
      }

      totalAmount += product.price * rawItem.quantity;
      orderItems.push({
        productId: normalizedProductId,
        quantity: rawItem.quantity,
        name: product.name,
        price: product.price,
        image: product.image,
      });
    }

    const newOrder = new Order({
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: typeof customer.email === 'string' ? customer.email.trim() : undefined,
        address: customer.address.trim(),
      },
      items: orderItems,
      paymentMethod,
      fulfillmentMethod,
      deliveryDate: typeof body.deliveryDate === 'string' ? new Date(body.deliveryDate) : undefined,
      deliveryTime: typeof body.deliveryTime === 'string' ? body.deliveryTime.slice(0, 50) : undefined,
      notes,
      totalAmount,
      status: 'pending',
      paymentStatus: 'pending',
    });

    await newOrder.save();
    invalidateOrdersCache();
    invalidateOrderStatsCache();

    // Отправка уведомления в Telegram
    try {
      const admins = await User.find({ role: 'admin' });

      for (const admin of admins) {
        const telegramIds = [
          admin.telegram_id,
          admin.telegram_id2,
          admin.telegram_id3
        ].filter(id => id && id.trim() !== '');

        for (const telegramId of telegramIds) {
          try {
            if (telegramRateLimiter.canSend()) {
              await sendOrderNotification(telegramId, {
                orderNumber: newOrder._id.toString(),
                customer: {
                  name: newOrder.customer.name,
                  phone: newOrder.customer.phone,
                  email: newOrder.customer.email,
                },
                items: orderItems,
                totalAmount: totalAmount,
              });
              telegramRateLimiter.recordSent();
            } else {
              productionLogger.warn('Telegram rate limit exceeded, notification skipped', {
                orderId: newOrder._id.toString(),
                telegramId,
                stats: telegramRateLimiter.getStats(),
              });
            }
          } catch (err) {
            productionLogger.error('Failed to send Telegram notification', err, {
              orderId: newOrder._id.toString(),
              telegramId,
            });
          }
        }
      }
    } catch (telegramError) {
      productionLogger.error('Ошибка отправки уведомления в Telegram:', telegramError);
      // Не прерываем выполнение, если не удалось отправить уведомление
    }

    return NextResponse.json({ message: 'Заказ успешно создан', order: newOrder }, { status: 201 });
  
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен - требуется роль администратора' }, { status: 403 });
    }

    await dbConnect();

    const body = sanitizeMongoObject(await request.json());
    const id = typeof body._id === 'string' ? body._id : '';
    if (!id) {
      return NextResponse.json({ error: 'ID заказа обязателен' }, { status: 400 });
    }

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
