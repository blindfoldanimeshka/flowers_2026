export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
'use server';

import { revalidatePath } from 'next/cache';
import { getCachedOrderStats, invalidateOrderStatsCache, invalidateOrdersCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Создание нового заказа
export async function createOrder(formData: FormData) {
  try {
    const customerName = formData.get('customerName') as string;
    const customerEmail = formData.get('customerEmail') as string;
    const customerPhone = formData.get('customerPhone') as string;
    const customerAddress = formData.get('customerAddress') as string;
    
    const itemsJson = formData.get('items') as string;
    const totalAmount = parseFloat(formData.get('totalAmount') as string);
    const paymentMethod = formData.get('paymentMethod') as string;
    const fulfillmentMethod = (formData.get('fulfillmentMethod') as string) || 'delivery';
    const deliveryDate = formData.get('deliveryDate') as string;
    const deliveryTime = formData.get('deliveryTime') as string;
    const notes = formData.get('notes') as string;
    
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
    
    const orderData: any = {
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress
      },
      items,
      totalAmount,
      paymentMethod,
      fulfillmentMethod,
      status: 'pending'
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
    
    const { data, error } = await supabase
      .from('documents')
      .insert({ collection: 5, doc: JSON.stringify(orderData) })
      .select()
      .single();
    
    if (error) {
      productionLogger.error('Ошибка при создании заказа (Supabase):', error);
      return {
        success: false,
        error: 'Ошибка при создании заказа'
      };
    }
    
    const order = { id: data.id, ...JSON.parse(data.doc) };
    
    invalidateOrdersCache();
    invalidateOrderStatsCache();
    revalidatePath('/admin/orders');
    
    return {
      success: true,
      order
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при создании заказа:', error);
    return {
      success: false,
      error: 'Ошибка при создании заказа'
    };
  }
}

// Обновление статуса заказа
export async function updateOrderStatus(orderId: string, status: string) {
  try {
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
    
    // Получаем текущий документ
    const { data: existing, error: existingError } = await supabase
      .from('documents')
      .select('doc')
      .eq('id', orderId)
      .eq('collection', 5)
      .single();
    
    if (existingError || !existing) {
      productionLogger.error('Ошибка при поиске заказа (Supabase):', existingError);
      return {
        success: false,
        error: 'Заказ не найден'
      };
    }
    
    const existingDoc = JSON.parse(existing.doc);
    const updatedDoc = { ...existingDoc, status };
    
    const { data, error } = await supabase
      .from('documents')
      .update({ doc: JSON.stringify(updatedDoc) })
      .eq('id', orderId)
      .eq('collection', 5)
      .select()
      .single();
    
    if (error || !data) {
      productionLogger.error('Ошибка при обновлении статуса заказа (Supabase):', error);
      return {
        success: false,
        error: 'Ошибка обновления статуса'
      };
    }
    
    const order = { id: data.id, ...JSON.parse(data.doc) };
    
    invalidateOrdersCache();
    invalidateOrderStatsCache();
    revalidatePath('/admin/orders');
    
    return {
      success: true,
      order
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при обновлении статуса заказа:', error);
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
    
    const { getCachedOrders } = await import('@/lib/cache');
    const result = await getCachedOrders({ email });
    
    return {
      success: true,
      orders: result.orders
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при получении заказов клиента:', error);
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
    const { getCachedOrders } = await import('@/lib/cache');
    const result = await getCachedOrders(filters || {});
    
    return {
      success: true,
      ...result
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при получении заказов:', error);
    return {
      success: false,
      error: 'Ошибка при получении заказов'
    };
  }
}

// Получение статистики заказов (с кэшированием)
export async function getOrderStats() {
  try {
    const stats = await getCachedOrderStats();
    
    return {
      success: true,
      stats
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при получении статистики:', error);
    return {
      success: false,
      error: 'Ошибка при получении статистики'
    };
  }
}