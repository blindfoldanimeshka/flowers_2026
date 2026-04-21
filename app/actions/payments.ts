export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import PaymentSettings, { IPaymentSettings } from '@/models/PaymentSettings';
import { productionLogger } from '@/lib/productionLogger';

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
    // Секретные ключи загружаются из переменных окружения
  };
  
  yookassa: {
    enabled: boolean;
    shopId: string;
    // Секретные ключи загружаются из переменных окружения
  };
  
  sberbank: {
    enabled: boolean;
    merchantId: string;
    // Секретные ключи загружаются из переменных окружения
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
    await dbConnect();
    
    const settings = await PaymentSettings.getSettings();
    
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
    await dbConnect();
    
    const settings = await PaymentSettings.getSettings();
    
    // Получаем данные из формы (БЕЗ секретных ключей)
    const updateData: PaymentSettingsUpdate = {
      isEnabled: formData.get('isEnabled') === 'true',
      currency: formData.get('currency') as string,
      
      stripe: {
        enabled: formData.get('stripeEnabled') === 'true',
        publishableKey: formData.get('stripePublishableKey') as string
        // secretKey и webhookSecret загружаются из переменных окружения
      },
      
      yookassa: {
        enabled: formData.get('yookassaEnabled') === 'true',
        shopId: formData.get('yookassaShopId') as string
        // secretKey загружается из переменных окружения
      },
      
      sberbank: {
        enabled: formData.get('sberbankEnabled') === 'true',
        merchantId: formData.get('sberbankMerchantId') as string
        // apiKey загружается из переменных окружения
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
    
    // Валидируем обязательные переменные окружения для включенных платежных систем
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

    // Загружаем секретные ключи из переменных окружения только для включенных провайдеров
    const secureUpdateData = {
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
    
    // Обновляем настройки
    const updatedSettings = await PaymentSettings.findByIdAndUpdate(
      settings._id,
      secureUpdateData,
      { new: true, runValidators: true }
    );
    
    revalidatePath('/admin/settings');
    
    return {
      success: true,
      settings: updatedSettings
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
    await dbConnect();
    
    const settings = await PaymentSettings.getSettings();
    
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
    // Создаем AbortController для timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 8000); // 8 секунд timeout
    
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
    
    // Очищаем timeout после завершения запроса
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
    
    // Проверяем, является ли ошибка timeout
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
