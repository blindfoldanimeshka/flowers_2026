import mongoose, { Document } from 'mongoose';

export interface IOrderCounter extends Document {
  // Дата в формате YYYYMMDD (из Order модели)
  dateKey: string;
  // Последовательность заказов за день
  seq: number;
}

const orderCounterSchema = new mongoose.Schema<IOrderCounter>({
  dateKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  seq: {
    type: Number,
    required: true,
    default: 0,
  },
});

const OrderCounter =
  (mongoose.models.OrderCounter as mongoose.Model<IOrderCounter>) ||
  mongoose.model<IOrderCounter>('OrderCounter', orderCounterSchema);

export default OrderCounter;

