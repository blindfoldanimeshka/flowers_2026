export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { getCachedOrders, invalidateOrdersCache, invalidateOrderStatsCache } from '@/lib/cache';
import Product from '@/models/Product';

export async function GET(request: NextRequest) {
  try {
    console.log('Получение заказов из кэша...');

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const deliveryType = searchParams.get('deliveryType') ?? undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin' && !email) {
      return NextResponse.json(
        { error: 'Email обязателен для получения заказов клиента' },
        { status: 400 }
      );
    }

    const filters = {
      email,
      status,
      deliveryType,
      page,
      limit
    };

    const result = await getCachedOrders(filters);
    console.log(`Получено заказов из кэша: ${result.orders.length}${deliveryType ? ` (тип: ${deliveryType})` : ''}`);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error('Ошибка при получении заказов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении заказов', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      customer,
      items,
      paymentMethod,
      notes,
      fulfillmentMethod,
      deliveryType,
      deliveryDate,
      deliveryTime,
    } = body;

    const resolvedFulfillmentMethod = fulfillmentMethod || deliveryType;

    if (!customer || !items || !paymentMethod || !resolvedFulfillmentMethod || items.length === 0) {
      return NextResponse.json({ error: 'Неполные данные для создания заказа' }, { status: 400 });
    }

    let totalAmount = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return NextResponse.json({ error: `Товар с ID ${item.productId} не найден` }, { status: 404 });
      }

      totalAmount += product.price * item.quantity;
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        name: product.name,
        price: product.price,
        image: product.image,
      });
    }

    const newOrder = new Order({
      customer,
      items: orderItems,
      paymentMethod,
      fulfillmentMethod: resolvedFulfillmentMethod,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      deliveryTime: deliveryTime || undefined,
      notes,
      totalAmount,
      status: 'pending',
      paymentStatus: 'pending',
    });

    await newOrder.save();

    invalidateOrdersCache();
    invalidateOrderStatsCache();

    console.log(`[НОВЫЙ ЗАКАЗ] Создан заказ #${newOrder.orderNumber} на сумму ${totalAmount} ₽ для ${customer.name}`);

    return NextResponse.json({
      message: 'Заказ успешно создан',
      order: newOrder
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Ошибка при создании заказа:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании заказа', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен - требуется роль администратора' },
        { status: 403 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const { _id, ...updateData } = body;

    if (!_id) {
      return NextResponse.json(
        { error: 'ID заказа обязателен' },
        { status: 400 }
      );
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      _id,
      updateData,
      { new: true, runValidators: true }
    ).populate('items.productId', 'name price image');

    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    invalidateOrdersCache();
    invalidateOrderStatsCache();

    return NextResponse.json({ order: updatedOrder }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при обновлении заказа:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Ошибка при обновлении заказа', details: error.message },
      { status: 500 }
    );
  }
}

export async function GETAll() {
  try {
    await dbConnect();
    const orders = await Order.find().sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Ошибка при получении заказов:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
