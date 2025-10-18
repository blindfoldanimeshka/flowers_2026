import mongoose from 'mongoose';

export interface IPaymentSettings extends mongoose.Document {
  // Основные настройки
  isEnabled: boolean;
  currency: string;
  
  // Настройки для разных платежных систем
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
  
  // Настройки для наличных и карт при доставке
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
  
  // Дополнительные настройки
  taxRate: number; // НДС в процентах
  deliveryFee: number; // Стоимость доставки
  freeDeliveryThreshold: number; // Порог для бесплатной доставки
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentSettingsModel extends mongoose.Model<IPaymentSettings> {
  getSettings(): Promise<IPaymentSettings>;
}

const paymentSettingsSchema = new mongoose.Schema<IPaymentSettings>({
  isEnabled: {
    type: Boolean,
    default: true
  },
  currency: {
    type: String,
    default: 'RUB',
    enum: ['RUB', 'USD', 'EUR']
  },
  
  stripe: {
    enabled: {
      type: Boolean,
      default: false
    },
    publishableKey: {
      type: String,
      default: ''
    },
    secretKey: {
      type: String,
      default: ''
    },
    webhookSecret: {
      type: String,
      default: ''
    }
  },
  
  yookassa: {
    enabled: {
      type: Boolean,
      default: false
    },
    shopId: {
      type: String,
      default: ''
    },
    secretKey: {
      type: String,
      default: ''
    }
  },
  
  sberbank: {
    enabled: {
      type: Boolean,
      default: false
    },
    merchantId: {
      type: String,
      default: ''
    },
    apiKey: {
      type: String,
      default: ''
    }
  },
  
  cashOnDelivery: {
    enabled: {
      type: Boolean,
      default: true
    },
    minAmount: {
      type: Number,
      default: 0
    },
    maxAmount: {
      type: Number,
      default: 50000
    }
  },
  
  cardOnDelivery: {
    enabled: {
      type: Boolean,
      default: true
    },
    minAmount: {
      type: Number,
      default: 0
    },
    maxAmount: {
      type: Number,
      default: 100000
    }
  },
  
  taxRate: {
    type: Number,
    default: 0, // 0% НДС
    min: 0,
    max: 100
  },
  
  deliveryFee: {
    type: Number,
    default: 300,
    min: 0
  },
  
  freeDeliveryThreshold: {
    type: Number,
    default: 3000,
    min: 0
  }
}, {
  timestamps: true
});

// Создаем единственную запись настроек при первом запуске
paymentSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  
  if (!settings) {
    settings = await this.create({});
  }
  
  return settings;
};

export default (mongoose.models.PaymentSettings as IPaymentSettingsModel) || mongoose.model<IPaymentSettings, IPaymentSettingsModel>('PaymentSettings', paymentSettingsSchema); 