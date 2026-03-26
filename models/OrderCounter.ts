import { createSupabaseModel } from '@/lib/supabaseModel';

export interface IOrderCounter {
  _id: string;
  dateKey: string;
  seq: number;
}

const OrderCounter = createSupabaseModel({
  collection: 'order_counters',
  defaults: { seq: 0 },
});

export default OrderCounter;
