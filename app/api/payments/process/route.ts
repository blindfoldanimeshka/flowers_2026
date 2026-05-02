export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';

// POST запрос для обработки платежа
export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    const { orderId, paymentMethod, paymentData } = body;

    if (!orderId || !paymentMethod) {
      return NextResponse.json(
        { error: 'ID заказа и способ оплаты обязательны' },
        { status: 400 }
      );
    }

    // Получаем заказ
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      productionLogger.error('Supabase order fetch error:', orderError);
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    // Получаем настройки платежей
    const { data: settings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('*')
      .maybeSingle();

    if (settingsError || !settings) {
      productionLogger.error('Supabase payment settings fetch error:', settingsError);
      return NextResponse.json(
        { error: 'Платежи временно недоступны' },
        { status: 503 }
      );
    }

    if (!settings.is_enabled) {
      return NextResponse.json(
        { error: 'Платежи временно недоступны' },
        { status: 503 }
      );
    }

    let paymentResult;

    // Обрабатываем платеж в зависимости от метода
    switch (paymentMethod) {
      case 'stripe':
        paymentResult = await processStripePayment(order, paymentData, settings);
        break;
        
      case 'yookassa':
        paymentResult = await processYookassaPayment(order, paymentData, settings);
        break;
        
      case 'sberbank':
        paymentResult = await processSberbankPayment(order, paymentData, settings);
        break;
        
      case 'cash':
        paymentResult = await processCashPayment(order, settings);
        break;
        
      case 'card':
        paymentResult = await processCardPayment(order, settings);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Неподдерживаемый способ оплаты' },
          { status: 400 }
        );
    }

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error },
        { status: 400 }
      );
    } else {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: paymentResult.paymentStatus,
          status: paymentResult.orderStatus
        })
        .eq('id', orderId);

      if (updateError) {
        productionLogger.error('Supabase order update error:', updateError);
      }

      return NextResponse.json({
        success: true,
        paymentId: paymentResult.paymentId,
        status: paymentResult.paymentStatus,
        message: paymentResult.message
      }, { status: 200 });
    }
   
});

      return NextResponse.json({
        success: true,
        paymentId: paymentResult.paymentId,
        status: paymentResult.paymentStatus,
        message: paymentResult.message
      }, { status: 200 });
    }
    
  
});

// Заглушка для Stripe
async function processStripePayment(order: any, paymentData: any, settings: any) {
  if (!settings.stripe.enabled) {
    return {
      success: false,
      error: 'Stripe не настроен'
    };
  }

  return {
    success: false,
    error: 'Stripe: интеграция в разработке'
  };
}

// Заглушка для ЮKassa
async function processYookassaPayment(order: any, paymentData: any, settings: any) {
  if (!settings.yookassa.enabled) {
    return {
      success: false,
      error: 'ЮKassa не настроен'
    };
  }

  return {
    success: false,
    error: 'ЮKassa: интеграция в разработке'
  };
}

// Заглушка для Сбербанка
async function processSberbankPayment(order: any, paymentData: any, settings: any) {
  if (!settings.sberbank.enabled) {
    return {
      success: false,
      error: 'Сбербанк не настроен'
    };
  }

  return {
    success: false,
    error: 'Сбербанк: интеграция в разработке'
  };
}

// Обработка наличных при доставке
async function processCashPayment(order: any, settings: any) {
  if (!settings.cashOnDelivery.enabled) {
    return {
      success: false,
      error: 'Оплата наличными при доставке недоступна'
    };
  }
  
  if (order.totalAmount < settings.cashOnDelivery.minAmount) {
    return {
      success: false,
      error: `Минимальная сумма для оплаты наличными: ${settings.cashOnDelivery.minAmount} ${settings.currency}`
    };
  }
  
  if (order.totalAmount > settings.cashOnDelivery.maxAmount) {
    return {
      success: false,
      error: `Максимальная сумма для оплаты наличными: ${settings.cashOnDelivery.maxAmount} ${settings.currency}`
    };
  }
  
  return {
    success: true,
    paymentId: `cash_${Date.now()}`,
    paymentStatus: 'pending',
    orderStatus: 'confirmed',
    message: 'Заказ подтвержден. Оплата при доставке.'
  };
}

// Обработка карты при доставке
async function processCardPayment(order: any, settings: any) {
  if (!settings.cardOnDelivery.enabled) {
    return {
      success: false,
      error: 'Оплата картой при доставке недоступна'
    };
  }
  
  if (order.totalAmount < settings.cardOnDelivery.minAmount) {
    return {
      success: false,
      error: `Минимальная сумма для оплаты картой: ${settings.cardOnDelivery.minAmount} ${settings.currency}`
    };
  }
  
  if (order.totalAmount > settings.cardOnDelivery.maxAmount) {
    return {
      success: false,
      error: `Максимальная сумма для оплаты картой: ${settings.cardOnDelivery.maxAmount} ${settings.currency}`
    };
  }
  
  return {
    success: true,
    paymentId: `card_${Date.now()}`,
    paymentStatus: 'pending',
    orderStatus: 'confirmed',
    message: 'Заказ подтвержден. Оплата картой при доставке.'
  };
} 