export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import PaymentSettings from '@/models/PaymentSettings';

// GET запрос для получения настроек платежей
export async function GET(_request: NextRequest) {
  try {
    await dbConnect();
    
    const settings = await PaymentSettings.getSettings();
    
    // Возвращаем только публичные настройки (без секретных ключей)
    const publicSettings = {
      isEnabled: settings.isEnabled,
      currency: settings.currency,
      stripe: {
        enabled: settings.stripe.enabled,
        publishableKey: settings.stripe.publishableKey
      },
      yookassa: {
        enabled: settings.yookassa.enabled
      },
      sberbank: {
        enabled: settings.sberbank.enabled
      },
      cashOnDelivery: settings.cashOnDelivery,
      cardOnDelivery: settings.cardOnDelivery,
      taxRate: settings.taxRate,
      deliveryFee: settings.deliveryFee,
      freeDeliveryThreshold: settings.freeDeliveryThreshold
    };
    
    return NextResponse.json({ settings: publicSettings }, { status: 200 });
    
  } catch (error: any) {
    console.error('Ошибка при получении настроек платежей:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении настроек платежей', details: error.message },
      { status: 500 }
    );
  }
}

// PUT запрос для обновления настроек платежей (только для админов)
export async function PUT(request: NextRequest) {
  try {
    // Получаем информацию о пользователе из middleware
    const userRole = request.headers.get('x-user-role');
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен - требуется роль администратора' },
        { status: 403 }
      );
    }

    await dbConnect();
    
    const body = await request.json();
    
    const settings = await PaymentSettings.getSettings();
    
    // Обновляем настройки
    const updatedSettings = await PaymentSettings.findByIdAndUpdate(
      settings._id,
      body,
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({ settings: updatedSettings }, { status: 200 });
    
  } catch (error: any) {
    console.error('Ошибка при обновлении настроек платежей:', error);
    
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
      { error: 'Ошибка при обновлении настроек платежей', details: error.message },
      { status: 500 }
    );
  }
} 