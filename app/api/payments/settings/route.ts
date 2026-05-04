export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';

const PAYMENT_SETTINGS_ID = 'default';

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

export const GET = withErrorHandler(async (_request: NextRequest) => {
    let { data: settings, error } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('id', PAYMENT_SETTINGS_ID)
      .maybeSingle();

    if (error || !settings) {
      const fallback = await supabase
        .from('payment_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      settings = fallback.data;
      error = fallback.error;
    }

    if (error || !settings) {
      productionLogger.error('Supabase payment settings fetch error:', error);
      return NextResponse.json(
        { settings: { isEnabled: false, currency: 'RUB' } },
        { status: 200 }
      );
    }

    const publicSettings = {
      isEnabled: settings.is_enabled,
      currency: settings.currency,
      stripe: {
        enabled: settings.stripe?.enabled,
        publishableKey: settings.stripe?.publishableKey,
      },
      yookassa: {
        enabled: settings.yookassa?.enabled,
      },
      sberbank: {
        enabled: settings.sberbank?.enabled,
      },
      cashOnDelivery: settings.cash_on_delivery,
      cardOnDelivery: settings.card_on_delivery,
      taxRate: settings.tax_rate,
      deliveryFee: settings.delivery_fee,
      freeDeliveryThreshold: settings.free_delivery_threshold,
    };

    return NextResponse.json({ settings: publicSettings }, { status: 200 });
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен - требуется роль администратора' }, { status: 403 });
    }

    const body = await request.json();
    const updateData = buildPaymentSettingsUpdate(body);
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Нет допустимых полей для обновления' }, { status: 400 });
    }

    let { data: updatedSettings, error } = await supabase
      .from('payment_settings')
      .update(updateData)
      .eq('id', PAYMENT_SETTINGS_ID)
      .select('*')
      .maybeSingle();

    if (error || !updatedSettings) {
      const fallbackUpdate = await supabase
        .from('payment_settings')
        .update(updateData)
        .select('*')
        .limit(1)
        .maybeSingle();
      updatedSettings = fallbackUpdate.data;
      error = fallbackUpdate.error;
    }

    if (error || !updatedSettings) {
      productionLogger.error('Supabase payment settings update error:', error);
      return NextResponse.json({ error: error?.message || 'Ошибка обновления настроек' }, { status: 500 });
    }

    return NextResponse.json({ settings: updatedSettings }, { status: 200 });
});
