export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
'use server';

import { revalidatePath } from 'next/cache';
import { productionLogger } from '@/lib/productionLogger';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Type guard для безопасной обработки ошибок
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

// Интерфейс для обновления настроек платежей (без секретных ключей)
interface PaymentSettingsUpdate {
  isEnabled: boolean;
  currency: string;
  
  stripe: {
    enabled: boolean;
    publishableKey: string;
  };
  
  yookassa: {
    enabled: boolean;
    shopId: string;
  };
  
  sberbank: {
    enabled: boolean;
    merchantId: string;
  };
  
  cashOnDelivery: {
    enabled: boolean;
    minAmount: number;
    maxAmount: number;
  };
  
  cardOnDelivery: {
    enabled: boolean;
    minAmount: number;
    maxAmount: number;
  };
  
  taxRate: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
}

// Получение настроек платежей
export async function getPaymentSettings() {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('collection', 8)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: true,
          settings: null
        };
      }
      productionLogger.error('Ошибка при получении настроек платежей (Supabase):', error);
      return {
        success: false,
        error: 'Ошибка при получении настроек платежей'
      };
    }
    
    const settings = data ? { id: data.id, ...JSON.parse(data.doc) } : null;
    
    return {
      success: true,
      settings
    };
    
  } catch (error: unknown) {
    const errorMessage = isError(error) ? error.message : String(error);
    productionLogger.error('Ошибка при получении настроек платежей:', errorMessage);
    return {
      success: false,
      error: 'Ошибка при получении настроек платежей'
    };
  }
}

// Обновление настроек платежей
export async function updatePaymentSettings(formData: FormData) {
  try {
    const { data: existing, error: existingError } = await supabase
      .from('documents')
      .select('*')
      .eq('collection', 8)
      .single();
    
    if (existingError && existingError.code !== 'PGRST116') {
      productionLogger.error('Ошибка поиска настроек платежей (Supabase):', existingError);
      return {
        success: false,
        error: 'Ошибка получения настроек'
      };
    }
    
    const currentSettings = existing ? JSON.parse(existing.doc) : {};
    
    const updateData: PaymentSettingsUpdate = {
      isEnabled: formData.get('isEnabled') === 'true',
      currency: formData.get('currency') as string,
      
      stripe: {
        enabled: formData.get('stripeEnabled') === 'true',
        publishableKey: formData.get('stripePublishableKey') as string
      },
      
      yookassa: {
        enabled: formData.get('yookassaEnabled') === 'true',
        shopId: formData.get('yookassaShopId') as string
      },
      
      sberbank: {
        enabled: formData.get('sberbankEnabled') === 'true',
        merchantId: formData.get('sberbankMerchantId') as string
      },
      
      cashOnDelivery: {
        enabled: formData.get('cashOnDeliveryEnabled') === 'true',
        minAmount: parseFloat(formData.get('cashOnDeliveryMinAmount') as string) || 0,
        maxAmount: parseFloat(formData.get('cashOnDeliveryMaxAmount') as string) || 50000
      },
      
      cardOnDelivery: {
        enabled: formData.get('cardOnDeliveryEnabled') === 'true',
        minAmount: parseFloat(formData.get('cardOnDeliveryMinAmount') as string) || 0,
        maxAmount: parseFloat(formData.get('cardOnDeliveryMaxAmount') as string) || 100000
      },
      
      taxRate: parseFloat(formData.get('taxRate') as string) || 0,
      deliveryFee: parseFloat(formData.get('deliveryFee') as string) || 300,
      freeDeliveryThreshold: parseFloat(formData.get('freeDeliveryThreshold') as string) || 3000
    };
    
    // Валидируем обязательные переменные окружения
    if (updateData.stripe.enabled && !process.env.STRIPE_SECRET_KEY) {
      return {
        success: false,
        error: 'STRIPE_SECRET_KEY environment variable is required when Stripe is enabled'
      };
    }
    if (updateData.stripe.enabled && !process.env.STRIPE_WEBHOOK_SECRET) {
      return {
        success: false,
        error: 'STRIPE_WEBHOOK_SECRET environment variable is required when Stripe is enabled'
      };
    }
    if (updateData.yookassa.enabled && !process.env.YOOKASSA_SECRET_KEY) {
      return {
        success: false,
        error: 'YOOKASSA_SECRET_KEY environment variable is required when Yookassa is enabled'
      };
    }
    if (updateData.sberbank.enabled && !process.env.SBERBANK_API_KEY) {
      return {
        success: false,
        error: 'SBERBANK_API_KEY environment variable is required when Sberbank is enabled'
      };
    }

    // Загружаем секретные ключи из переменных окружения
    const secureUpdateDoc = {
      ...updateData,
      stripe: {
        ...updateData.stripe,
        ...(updateData.stripe.enabled && {
          secretKey: process.env.STRIPE_SECRET_KEY,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
        })
      },
      yookassa: {
        ...updateData.yookassa,
        ...(updateData.yookassa.enabled && {
          secretKey: process.env.YOOKASSA_SECRET_KEY
        })
      },
      sberbank: {
        ...updateData.sberbank,
        ...(updateData.sberbank.enabled && {
          apiKey: process.env.SBERBANK_API_KEY
        })
      }
    };
    
    let updatedData;
    if (existing) {
      // Обновляем существующий документ
      const { data, error } = await supabase
        .from('documents')
        .update({ doc: JSON.stringify(secureUpdateDoc) })
        .eq('id', existing.id)
        .eq('collection', 8)
        .select()
        .single();
      
      if (error || !data) {
        productionLogger.error('Ошибка обновления настроек платежей (Supabase):', error);
        return {
          success: false,
          error: 'Ошибка обновления настроек платежей'
        };
      }
      updatedData = data;
    } else {
      // Создаем новый документ
      const { data, error } = await supabase
        .from('documents')
        .insert({ collection: 8, doc: JSON.stringify(secureUpdateDoc) })
        .select()
        .single();
      
      if (error || !data) {
        productionLogger.error('Ошибка создания настроек платежей (Supabase):', error);
        return {
          success: false,
          error: 'Ошибка создания настроек платежей'
        };
      }
      updatedData = data;
    }
    
    revalidatePath('/admin/settings');
    
    return {
      success: true,
      settings: { id: updatedData.id, ...JSON.parse(updatedData.doc) }
    };
    
  } catch (error: unknown) {
    const errorMessage = isError(error) ? error.message : String(error);
    productionLogger.error('Ошибка при обновлении настроек платежей:', errorMessage);
    
    if (isError(error) && error.name === 'ValidationError') {
      const validationErrors = Object.values((error as any).errors).map(
        (err: any) => err.message
      );
      return {
        success: false,
        error: `Ошибка валидации: ${validationErrors.join(', ')}`
      };
    }
    
    return {
      success: false,
      error: 'Ошибка при обновлении настроек платежей'
    };
  }
}

// Получение доступных способов оплаты
export async function getAvailablePaymentMethods(orderAmount: number) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('collection', 8)
      .single();
    
    if (error || !data) {
      productionLogger.error('Ошибка получения настроек платежей (Supabase):', error);
      return {
        success: false,
        error: 'Ошибка получения настроек платежей'
      };
    }
    
    const settings = JSON.parse(data.doc);
    
    if (!settings.isEnabled) {
      return {
        success: false,
        error: 'Платежи временно недоступны'
      };
    }
    
    const availableMethods: Array<{ id: string; name: string; description: string; icon: string }> = [];
    
    // Проверяем Stripe
    if (settings.stripe.enabled && settings.stripe.publishableKey) {
      availableMethods.push({
        id: 'stripe',
        name: 'Банковская карта (онлайн)',
        description: 'Оплата картой через Stripe',
        icon: '💳'
      });
    }
    
    // Проверяем ЮKassa
    if (settings.yookassa.enabled && settings.yookassa.shopId) {
      availableMethods.push({
        id: 'yookassa',
        name: 'ЮKassa',
        description: 'Оплата через ЮKassa',
        icon: '🏦'
      });
    }
    
    // Проверяем Сбербанк
    if (settings.sberbank.enabled && settings.sberbank.merchantId) {
      availableMethods.push({
        id: 'sberbank',
        name: 'Сбербанк Онлайн',
        description: 'Оплата через Сбербанк',
        icon: '🟢'
      });
    }
    
    // Проверяем наличные при доставке
    if (settings.cashOnDelivery.enabled) {
      if (orderAmount >= settings.cashOnDelivery.minAmount && 
          orderAmount <= settings.cashOnDelivery.maxAmount) {
        availableMethods.push({
          id: 'cash',
          name: 'Наличные при доставке',
          description: 'Оплата наличными курьеру',
          icon: '💰'
        });
      }
    }
    
    // Проверяем карту при доставке
    if (settings.cardOnDelivery.enabled) {
      if (orderAmount >= settings.cardOnDelivery.minAmount && 
          orderAmount <= settings.cardOnDelivery.maxAmount) {
        availableMethods.push({
          id: 'card',
          name: 'Карта при доставке',
          description: 'Оплата картой курьеру',
          icon: '💳'
        });
      }
    }
    
    return {
      success: true,
      methods: availableMethods,
      currency: settings.currency,
      deliveryFee: settings.deliveryFee,
      freeDeliveryThreshold: settings.freeDeliveryThreshold
    };
    
  } catch (error: unknown) {
    const errorMessage = isError(error) ? error.message : String(error);
    productionLogger.error('Ошибка при получении способов оплаты:', errorMessage);
    return {
      success: false,
      error: 'Ошибка при получении способов оплаты'
    };
  }
}

// Обработка платежа
export async function processPayment(orderId: string, paymentMethod: string, paymentData?: any) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 8000);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/payments/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        paymentMethod,
        paymentData
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Ошибка при обработке платежа'
      };
    }

    const result = await response.json();
    
    revalidatePath('/admin/orders');
    
    return {
      success: true,
      ...result
    };

  } catch (error: unknown) {
    const errorMessage = isError(error) ? error.message : String(error);
    productionLogger.error('Ошибка при обработке платежа:', errorMessage);
    
    if (isError(error) && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Превышено время ожидания обработки платежа. Попробуйте еще раз.'
      };
    }
    
    return {
      success: false,
      error: 'Ошибка при обработке платежа'
    };
  }
}