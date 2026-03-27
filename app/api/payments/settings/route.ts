export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import PaymentSettings from '@/models/PaymentSettings';
import { sanitizeMongoObject } from '@/lib/security';

function buildPaymentSettingsUpdate(body: Record<string, any>) {
  const update: Record<string, any> = {};

  if (typeof body.isEnabled === 'boolean') update.isEnabled = body.isEnabled;
  if (typeof body.currency === 'string' && body.currency.trim()) update.currency = body.currency.trim().slice(0, 10);
  if (typeof body.taxRate === 'number' && Number.isFinite(body.taxRate) && body.taxRate >= 0) update.taxRate = body.taxRate;
  if (typeof body.deliveryFee === 'number' && Number.isFinite(body.deliveryFee) && body.deliveryFee >= 0) update.deliveryFee = body.deliveryFee;
  if (typeof body.freeDeliveryThreshold === 'number' && Number.isFinite(body.freeDeliveryThreshold) && body.freeDeliveryThreshold >= 0) {
    update.freeDeliveryThreshold = body.freeDeliveryThreshold;
  }

  const safeGateway = (source: any, allowedKeys: string[]) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
    const result: Record<string, any> = {};
    for (const key of allowedKeys) {
      const value = source[key];
      if (typeof value === 'boolean') result[key] = value;
      if (typeof value === 'string') result[key] = value.trim();
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) result[key] = value;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  };

  const stripe = safeGateway(body.stripe, ['enabled', 'publishableKey', 'secretKey', 'webhookSecret']);
  if (stripe) update.stripe = stripe;

  const yookassa = safeGateway(body.yookassa, ['enabled', 'shopId', 'secretKey']);
  if (yookassa) update.yookassa = yookassa;

  const sberbank = safeGateway(body.sberbank, ['enabled', 'merchantId', 'apiKey']);
  if (sberbank) update.sberbank = sberbank;

  const cashOnDelivery = safeGateway(body.cashOnDelivery, ['enabled', 'minAmount', 'maxAmount']);
  if (cashOnDelivery) update.cashOnDelivery = cashOnDelivery;

  const cardOnDelivery = safeGateway(body.cardOnDelivery, ['enabled', 'minAmount', 'maxAmount']);
  if (cardOnDelivery) update.cardOnDelivery = cardOnDelivery;

  return update;
}

export async function GET(_request: NextRequest) {
  try {
    await dbConnect();

    const settings = await PaymentSettings.getSettings();
    const publicSettings = {
      isEnabled: settings.isEnabled,
      currency: settings.currency,
      stripe: {
        enabled: settings.stripe.enabled,
        publishableKey: settings.stripe.publishableKey,
      },
      yookassa: {
        enabled: settings.yookassa.enabled,
      },
      sberbank: {
        enabled: settings.sberbank.enabled,
      },
      cashOnDelivery: settings.cashOnDelivery,
      cardOnDelivery: settings.cardOnDelivery,
      taxRate: settings.taxRate,
      deliveryFee: settings.deliveryFee,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
    };

    return NextResponse.json({ settings: publicSettings }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при получении настроек платежей:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при получении настроек платежей',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен - требуется роль администратора' }, { status: 403 });
    }

    await dbConnect();

    const body = sanitizeMongoObject(await request.json());
    const updateData = buildPaymentSettingsUpdate(body);
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Нет допустимых полей для обновления' }, { status: 400 });
    }

    const settings = await PaymentSettings.getSettings();
    const updatedSettings = await PaymentSettings.findByIdAndUpdate(settings._id, { $set: updateData }, { new: true, runValidators: true });

    return NextResponse.json({ settings: updatedSettings }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при обновлении настроек платежей:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: 'Ошибка валидации', details: validationErrors }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: 'Ошибка при обновлении настроек платежей',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
