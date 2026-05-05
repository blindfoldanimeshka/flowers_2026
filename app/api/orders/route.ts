export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

function buildOrderNumber(date: Date, seq: number) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${String(seq).padStart(4, '0')}`;
}

async function getNextOrderNumber() {
  const today = new Date();
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dayStart.toISOString())
    .lt('created_at', dayEnd.toISOString());

  if (error) {
    throw new Error(`Не удалось определить следующий номер заказа: ${error.message}`);
  }

  return buildOrderNumber(today, (count || 0) + 1);
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
      `,
      { count: 'exact' }
    );

    if (status) {
      query = query.eq('status', status);
    }

    if (email) {
      query = query.eq('customer_email', email);
    }

    if (deliveryType) {
      query = query.eq('fulfillment_method', deliveryType);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('[ORDERS] Supabase error:', { message: error.message, code: error.code, details: error.details });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const orders = (data || []).map(mapOrderRow);
    const total = count || 0;

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
    const orderItems: Array<{
      productId: string;
      quantity: number;
      name: string;
      price: number;
      image: string;
    }> = [];

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

    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, image_url')
      .in('id', productIds);

    if (productsError) {
      console.error('[ORDERS] Supabase products error:', { message: productsError.message, code: productsError.code });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const productMap = new Map((productsData || []).map((row) => [row.id, row]));

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

      const productPrice = Number(product.price) || 0;
      totalAmount += productPrice * rawItem.quantity;
      orderItems.push({
        productId: normalizedProductId,
        quantity: rawItem.quantity,
        name: product.name,
        price: productPrice,
        image: product.image_url || '',
      });
    }

    const orderNumber = await getNextOrderNumber();

    const { data: newOrder, error: insertError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: customer.name.trim(),
        customer_email: typeof customer.email === 'string' ? customer.email.trim() || null : null,
        customer_phone: customer.phone.trim(),
        customer_address: customer.address.trim(),
        status: 'pending',
        payment_method: paymentMethod,
        fulfillment_method: fulfillmentMethod,
        delivery_date: typeof body.deliveryDate === 'string' && body.deliveryDate ? body.deliveryDate : null,
        delivery_time: typeof body.deliveryTime === 'string' ? body.deliveryTime.slice(0, 50) : null,
        notes: notes || null,
        total_amount: totalAmount,
        payment_status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[ORDERS] Supabase insert error:', { message: insertError.message, code: insertError.code });
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    invalidateOrdersCache();
    invalidateOrderStatsCache();

    const itemRows = orderItems.map((item) => ({
      order_id: newOrder.id,
      product_id: item.productId || null,
      product_name: item.name,
      price: item.price,
      quantity: item.quantity,
      image_url: item.image || null,
    }));
    const { error: orderItemsError } = await supabase.from('order_items').insert(itemRows);
    if (orderItemsError) {
      return NextResponse.json({ error: `Failed to create order items: ${orderItemsError.message}` }, { status: 500 });
    }

    const { data: fullOrder, error: fullOrderError } = await supabase
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
      .eq('id', newOrder.id)
      .single();

    if (fullOrderError || !fullOrder) {
      return NextResponse.json({ error: fullOrderError?.message || 'Failed to read created order' }, { status: 500 });
    }

    const orderResponse = mapOrderRow(fullOrder);

    // Отправка уведомления в Telegram в фоновом режиме (не блокирует ответ клиенту)
    setImmediate(async () => {
      try {
        const { data: settingsData } = await supabase
          .from('settings')
          .select('tg_id')
          .eq('id', 'global-settings')
          .maybeSingle();

        const tgIds = settingsData?.tg_id || [];

        for (const telegramId of tgIds) {
          try {
            if (await telegramRateLimiter.canSend()) {
              await sendOrderNotification(String(telegramId), {
                orderNumber,
                customer: {
                  name: customer.name?.trim() || '',
                  phone: customer.phone?.trim() || '',
                  email: typeof customer.email === 'string' ? customer.email.trim() : undefined,
                },
                items: orderItems,
                totalAmount,
              });
            }
          } catch (err) {
            productionLogger.error('Failed to send Telegram notification', err, {
              orderId: newOrder.id,
              telegramId,
            });
          }
        }
      } catch (telegramError) {
        productionLogger.error('Ошибка отправки уведомления в Telegram:', telegramError);
      }
    });

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

    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

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
      console.error('[ORDERS] Supabase update error:', { message: updateError.message, code: updateError.code });
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    invalidateOrdersCache();
    invalidateOrderStatsCache();

    const orderResponse = mapOrderRow(updatedOrder);
    return NextResponse.json({ order: orderResponse }, { status: 200 });
  
});
