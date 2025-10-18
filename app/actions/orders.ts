export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { getCachedOrderStats, invalidateOrderStatsCache, invalidateOrdersCache } from '@/lib/cache';

// Создание нового заказа
export async function createOrder(formData: FormData) {
  try {
    await dbConnect();
    
    // Получаем данные клиента
    const customerName = formData.get('customerName') as string;
    const customerEmail = formData.get('customerEmail') as string;
    const customerPhone = formData.get('customerPhone') as string;
    const customerAddress = formData.get('customerAddress') as string;
    
    // Получаем данные заказа
    const itemsJson = formData.get('items') as string;
    const totalAmount = parseFloat(formData.get('totalAmount') as string);
    const paymentMethod = formData.get('paymentMethod') as string;
    const deliveryDate = formData.get('deliveryDate') as string;
    const deliveryTime = formData.get('deliveryTime') as string;
    const notes = formData.get('notes') as string;
    
    // Валидация
    if (!customerName || !customerPhone || !customerAddress) {
      return {
        success: false,
        error: 'Имя, телефон и адрес клиента обязательны'
      };
    }
    
    if (!itemsJson || !totalAmount || !paymentMethod) {
      return {
        success: false,
        error: 'Данные заказа неполные'
      };
    }
    
    let items;
    try {
      items = JSON.parse(itemsJson);
    } catch {
      return {
        success: false,
        error: 'Неверный формат товаров'
      };
    }
    
    if (!Array.isArray(items) || items.length === 0) {
      return {
        success: false,
        error: 'Заказ должен содержать товары'
      };
    }
    
    // Создание заказа
    const orderData: any = {
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress
      },
      items,
      totalAmount,
      paymentMethod
    };
    
    if (deliveryDate) {
      orderData.deliveryDate = new Date(deliveryDate);
    }
    
    if (deliveryTime) {
      orderData.deliveryTime = deliveryTime;
    }
    
    if (notes) {
      orderData.notes = notes;
    }
    
    const order = await Order.create(orderData);
    
    // Инвалидируем кэш и обновляем страницы
    invalidateOrdersCache();
    invalidateOrderStatsCache();
    revalidatePath('/admin/orders');
    
    return {
      success: true,
      order
    };
    
  } catch (error: any) {
    console.error('Ошибка при создании заказа:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return {
        success: false,
        error: `Ошибка валидации: ${validationErrors.join(', ')}`
      };
    }
    
    return {
      success: false,
      error: 'Ошибка при создании заказа'
    };
  }
}

// Обновление статуса заказа
export async function updateOrderStatus(orderId: string, status: string) {
  try {
    await dbConnect();
    
    if (!orderId || !status) {
      return {
        success: false,
        error: 'ID заказа и статус обязательны'
      };
    }
    
    const validStatuses = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: 'Неверный статус заказа'
      };
    }
    
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true, runValidators: true }
    ).populate('items.productId', 'name price image');
    
    if (!order) {
      return {
        success: false,
        error: 'Заказ не найден'
      };
    }
    
    // Инвалидируем кэш и обновляем страницы
    invalidateOrdersCache();
    invalidateOrderStatsCache();
    revalidatePath('/admin/orders');
    
    return {
      success: true,
      order
    };
    
  } catch (error: any) {
    console.error('Ошибка при обновлении статуса заказа:', error);
    return {
      success: false,
      error: 'Ошибка при обновлении статуса заказа'
    };
  }
}

// Получение заказов клиента
export async function getCustomerOrders(email: string) {
  try {
    if (!email) {
      return {
        success: false,
        error: 'Email обязателен'
      };
    }
    
    // Используем кэшированный метод с фильтром по email
    const { getCachedOrders } = await import('@/lib/cache');
    const result = await getCachedOrders({ email });
    
    return {
      success: true,
      orders: result.orders
    };
    
  } catch (error: any) {
    console.error('Ошибка при получении заказов клиента:', error);
    return {
      success: false,
      error: 'Ошибка при получении заказов'
    };
  }
}

// Получение всех заказов (для админов)
export async function getAllOrders(filters?: {
  status?: string;
  email?: string;
  page?: number;
  limit?: number;
}) {
  try {
    // Используем кэшированный метод
    const { getCachedOrders } = await import('@/lib/cache');
    const result = await getCachedOrders(filters || {});
    
    return {
      success: true,
      ...result
    };
    
  } catch (error: any) {
    console.error('Ошибка при получении заказов:', error);
    return {
      success: false,
      error: 'Ошибка при получении заказов'
    };
  }
}

// Получение статистики заказов (с кэшированием)
export async function getOrderStats() {
  try {
    // Получаем статистику из кэша
    const stats = await getCachedOrderStats();
    
    return {
      success: true,
      stats
    };
    
  } catch (error: any) {
    console.error('Ошибка при получении статистики:', error);
    return {
      success: false,
      error: 'Ошибка при получении статистики'
    };
  }
} 