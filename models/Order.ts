import OrderCounter from '@/models/OrderCounter';
import { createSupabaseModel } from '@/lib/supabaseModel';

export interface IOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface IOrder {
  _id: string;
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
  deliveryDate?: string;
  deliveryTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const Order = createSupabaseModel({
  collection: 'orders',
  defaults: {
    status: 'pending',
    paymentStatus: 'pending',
  },
  references: {
    'items.productId': 'products',
  },
  preCreate: async (doc) => {
    if (!doc.orderNumber) {
      const date = new Date();
      const dateKey = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      const counter = await OrderCounter.findOneAndUpdate(
        { dateKey },
        { $inc: { seq: 1 }, $setOnInsert: { dateKey, seq: 0 } },
        { upsert: true, new: true }
      );
      doc.orderNumber = `${dateKey}-${String(counter.seq).padStart(4, '0')}`;
    }
  },
});

export default Order;
