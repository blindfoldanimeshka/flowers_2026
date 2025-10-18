import mongoose from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface IOrder extends mongoose.Document {
  orderNumber: string;
  customer: {
    name: string;
    email?: string;
    phone: string;
    address: string;
  };
  items: IOrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'cash' | 'card' | 'online';
  fulfillmentMethod: 'delivery' | 'pickup';
  deliveryDate?: Date;
  deliveryTime?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new mongoose.Schema<IOrderItem>({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  image: {
    type: String,
    required: true
  }
});

const orderSchema = new mongoose.Schema<IOrder>({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customer: {
    name: {
      type: String,
      required: [true, 'Имя клиента обязательно'],
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Телефон клиента обязателен'],
      trim: true
    },
    address: {
      type: String,
      trim: true,
      required: function(this: IOrder) {
        return this.fulfillmentMethod === 'delivery';
      },
      validate: {
        validator: function(this: IOrder, value: string) {
          // Адрес обязателен только для доставки
          if (this.fulfillmentMethod === 'delivery') {
            return value && value.trim().length > 0;
          }
          return true; // Для самовывоза адрес не обязателен
        },
        message: 'Адрес доставки обязателен для доставки'
      }
    }
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'],
    default: 'pending',
    validate: {
      validator: function(this: IOrder, value: string) {
        // Статус 'delivering' недопустим для самовывоза
        if (this.fulfillmentMethod === 'pickup' && value === 'delivering') {
          return false;
        }
        return true;
      },
      message: 'Статус "доставляется" недопустим для самовывоза'
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online'],
    required: [true, 'Способ оплаты обязателен']
  },
  fulfillmentMethod: {
    type: String,
    enum: ['delivery', 'pickup'],
    required: [true, 'Способ получения обязателен']
  },
  deliveryDate: {
    type: Date,
    required: function(this: IOrder) {
      return this.fulfillmentMethod === 'delivery';
    },
    validate: {
      validator: function(this: IOrder, value: Date) {
        // Дата доставки обязательна только для доставки
        if (this.fulfillmentMethod === 'delivery') {
          return value != null;
        }
        return true; // Для самовывоза дата не обязательна
      },
      message: 'Дата доставки обязательна для доставки'
    }
  },
  deliveryTime: {
    type: String,
    required: function(this: IOrder) {
      return this.fulfillmentMethod === 'delivery';
    },
    validate: {
      validator: function(this: IOrder, value: string) {
        // Время доставки обязательно только для доставки
        if (this.fulfillmentMethod === 'delivery') {
          return value && value.trim().length > 0;
        }
        return true; // Для самовывоза время не обязательно
      },
      message: 'Время доставки обязательно для доставки'
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Примечания не могут превышать 500 символов']
  }
}, {
  timestamps: true
});

// Генерация номера заказа перед сохранением
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Находим количество заказов за сегодня
    const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    const todayOrders = await mongoose.model('Order').countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    });
    
    const orderNumber = `${year}${month}${day}-${String(todayOrders + 1).padStart(3, '0')}`;
    this.orderNumber = orderNumber;
  }
  next();
});

// Pre-hooks to ensure validators run for update operations
orderSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  this.setOptions({ runValidators: true, context: 'query' });
  next();
});

// Индексы для быстрого поиска
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

export default mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema); 