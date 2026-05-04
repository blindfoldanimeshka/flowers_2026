export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase, SUPABASE_COLLECTION_TABLE } from '@/lib/supabase';

import { invalidateOrdersCache, invalidateOrderStatsCache } from '@/lib/cache';
import { sanitizeMongoObject, toIntInRange } from '@/lib/security';
import { sendOrderNotification } from '@/lib/telegram';
import { telegramRateLimiter } from '@/lib/telegram/rateLimiter';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'] as const;
const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;
const FULFILLMENT_TYPES = ['delivery', 'pickup'] as const;
const PAYMENT_METHODS = ['cash', 'card', 'online'] as const;
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

    let query = supabase
      .from(SUPABASE_COLLECTION_TABLE)
      .select('id, doc, created_at, updated_at')
      .eq('collection', ORDERS_COLLECTION);

    if (status) {
      query = query.eq('doc->>status', status);
    }

    if (email) {
      query = query.eq('doc->customer->>email', email);
    }

    if (deliveryType) {
      query = query.eq('doc->>fulfillmentMethod', deliveryType);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('[ORDERS] Supabase error:', { message: error.message, code: error.code, details: error.details });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const orders = (data || []).map(mapOrderRow);
    const total = orders.length; // Note: This is simplified, for exact count we'd need a count query

    return NextResponse.json({ orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }, { status: 200 });
  
});

export const POST = withErrorHandler(async (request: NextRequest) => {
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

    const productIds = items.map((item) =>
      typeof item.productId === 'string'
        ? item.productId.trim()
        : typeof item.productId === 'number' && Number.isFinite(item.productId)
          ? String(item.productId)
          : ''
    ).filter(Boolean);

    if (productIds.length === 0) {
      return NextResponse.json({ error: 'Некорректные позиции заказа' }, { status: 400 });
    }

    // Get products from Supabase
    const { data: productsData, error: productsError } = await supabase
      .from(SUPABASE_COLLECTION_TABLE)
      .select('id, doc')
      .eq('collection', 4) // products collection
      .in('id', productIds);

    if (productsError) {
      console.error('[ORDERS] Supabase products error:', { message: productsError.message, code: productsError.code });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const productMap = new Map(
      (productsData || []).map((row) => {
        const doc = typeof row.doc === 'string' ? JSON.parse(row.doc) : row.doc;
        return [row.id, { ...doc, _id: row.id }];
      })
    );

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

      const product = productMap.get(normalizedProductId);
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

    const orderDoc = {
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: typeof customer.email === 'string' ? customer.email.trim() : undefined,
        address: customer.address.trim(),
      },
      items: orderItems,
      paymentMethod,
      fulfillmentMethod,
      deliveryDate: typeof body.deliveryDate === 'string' ? body.deliveryDate : undefined,
      deliveryTime: typeof body.deliveryTime === 'string' ? body.deliveryTime.slice(0, 50) : undefined,
      notes,
      totalAmount,
      status: 'pending',
      paymentStatus: 'pending',
    };

    const { data: newOrder, error: insertError } = await supabase
      .from(SUPABASE_COLLECTION_TABLE)
      .insert({ collection: ORDERS_COLLECTION, doc: orderDoc })
      .select('id, created_at, updated_at')
      .single();

    if (insertError) {
      console.error('[ORDERS] Supabase insert error:', { message: insertError.message, code: insertError.code });
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    invalidateOrdersCache();
    invalidateOrderStatsCache();

    const orderResponse = {
      _id: newOrder.id,
      ...orderDoc,
      createdAt: newOrder.created_at,
      updatedAt: newOrder.updated_at,
    };

    // Отправка уведомления в Telegram
    try {
      const { data: admins, error: adminsError } = await supabase
        .from(SUPABASE_COLLECTION_TABLE)
        .select('doc')
        .eq('collection', 1) // users collection
        .eq('doc->>role', 'admin');

      if (adminsError) {
        productionLogger.error('Failed to fetch admins:', adminsError);
      } else {
        for (const adminRow of admins || []) {
          const admin = typeof adminRow.doc === 'string' ? JSON.parse(adminRow.doc) : adminRow.doc;
          const telegramIds = [
            admin.telegram_id,
            admin.telegram_id2,
            admin.telegram_id3
          ].filter((id: any) => id && id.trim() !== '');

          for (const telegramId of telegramIds) {
            try {
              if (await telegramRateLimiter.canSend()) {
                await sendOrderNotification(telegramId, {
                  orderNumber: newOrder.id,
                  customer: {
                    name: orderDoc.customer.name,
                    phone: orderDoc.customer.phone,
                    email: orderDoc.customer.email,
                  },
                  items: orderItems,
                  totalAmount: totalAmount,
                });
              } else {
                productionLogger.warn('Telegram rate limit exceeded, notification skipped', {
                  orderId: newOrder.id,
                  telegramId,
                  stats: await telegramRateLimiter.getStats(),
                });
              }
            } catch (err) {
              productionLogger.error('Failed to send Telegram notification', err, {
                orderId: newOrder.id,
                telegramId,
              });
            }
          }
        }
      }
    } catch (telegramError) {
      productionLogger.error('Ошибка отправки уведомления в Telegram:', telegramError);
    }

    return NextResponse.json({ message: 'Заказ успешно создан', order: orderResponse }, { status: 201 });
  
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен - требуется роль администратора' }, { status: 403 });
    }

    const body = sanitizeMongoObject(await request.json());
    const id = typeof body._id === 'string' ? body._id : '';
    if (!id) {
      return NextResponse.json({ error: 'ID заказа обязателен' }, { status: 400 });
    }

    // First, get the current order to update the doc JSONB field
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
      console.error('[ORDERS] Supabase update error:', { message: updateError.message, code: updateError.code });
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    invalidateOrdersCache();
    invalidateOrderStatsCache();

    const orderResponse = mapOrderRow(updatedOrder);
    return NextResponse.json({ order: orderResponse }, { status: 200 });
  
});
