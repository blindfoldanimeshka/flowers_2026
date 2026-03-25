import { createSupabaseModel } from '@/lib/supabaseModel';

export interface IPaymentSettings {
  _id: string;
  isEnabled: boolean;
  currency: string;
  stripe: {
    enabled: boolean;
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
  };
  yookassa: {
    enabled: boolean;
    shopId: string;
    secretKey: string;
  };
  sberbank: {
    enabled: boolean;
    merchantId: string;
    apiKey: string;
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

export interface IPaymentSettingsModel {
  getSettings(): Promise<IPaymentSettings>;
}

const PaymentSettings = createSupabaseModel({
  collection: 'payment_settings',
  defaults: {
    isEnabled: true,
    currency: 'RUB',
    stripe: { enabled: false, publishableKey: '', secretKey: '', webhookSecret: '' },
    yookassa: { enabled: false, shopId: '', secretKey: '' },
    sberbank: { enabled: false, merchantId: '', apiKey: '' },
    cashOnDelivery: { enabled: true, minAmount: 0, maxAmount: 50000 },
    cardOnDelivery: { enabled: true, minAmount: 0, maxAmount: 100000 },
    taxRate: 0,
    deliveryFee: 300,
    freeDeliveryThreshold: 3000,
  },
});

(PaymentSettings as any).getSettings = async function () {
  let settings = await (PaymentSettings as any).findOne();
  if (!settings) {
    settings = await (PaymentSettings as any).create({});
  }
  return settings;
};

export default PaymentSettings as any;
