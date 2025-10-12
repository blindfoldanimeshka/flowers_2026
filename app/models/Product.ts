import mongoose, { Schema, models, Document } from 'mongoose';

// Интерфейс продукта
export interface IProduct extends Document {
  name: string;
  title?: string; // для обратной совместимости
  price: number;
  oldPrice?: number;
  categoryId: mongoose.Types.ObjectId;
  subcategoryId?: mongoose.Types.ObjectId;
  image?: string;
  imageSrc?: string; // для обратной совместимости
  description?: string;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Название товара обязательно'],
    trim: true,
    maxlength: [100, 'Название товара не может быть длиннее 100 символов']
  },
  title: {
    type: String, // для обратной совместимости
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Цена обязательна'],
    min: [0, 'Цена не может быть отрицательной']
  },
  oldPrice: {
    type: Number,
    min: [0, 'Старая цена не может быть отрицательной']
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'ID категории обязателен']
  },
  subcategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory'
  },
  image: {
    type: String,
    trim: true,
    default: '/uploads/placeholder.jpg'
  },
  imageSrc: {
    type: String, // для обратной совместимости
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Описание не может быть длиннее 500 символов']
  },
  inStock: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Индексы для быстрого поиска
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ title: 'text' }); // для обратной совместимости
productSchema.index({ categoryId: 1 });
productSchema.index({ subcategoryId: 1 });
productSchema.index({ price: 1 });
productSchema.index({ inStock: 1 });

// Виртуальные поля для обратной совместимости
productSchema.virtual('category').get(function() {
  return this.categoryId;
});

productSchema.virtual('subcategory').get(function() {
  return this.subcategoryId;
});

// Убеждаемся, что виртуальные поля включаются в JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

export const Product = models.Product || mongoose.model<IProduct>('Product', productSchema);
export default Product;
