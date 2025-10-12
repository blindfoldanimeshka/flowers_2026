import mongoose from 'mongoose';

// Интерфейс продукта
export interface IProduct extends mongoose.Document {
  name: string;
  price: number;
  categoryId: mongoose.Types.ObjectId;
  categoryNumId: number;
  subcategoryId?: mongoose.Types.ObjectId;
  subcategoryNumId?: number;
  image: string;
  description: string;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new mongoose.Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Название товара обязательно'],
    trim: true,
    maxlength: [100, 'Название товара не может быть длиннее 100 символов']
  },
  price: {
    type: Number,
    required: [true, 'Цена обязательна'],
    min: [0, 'Цена не может быть отрицательной']
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'ID категории обязателен']
  },
  categoryNumId: {
    type: Number,
    required: [true, 'Числовой ID категории обязателен']
  },
  subcategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory'
  },
  subcategoryNumId: {
    type: Number
  },
  image: {
    type: String,
    required: [true, 'Изображение товара обязательно'],
    default: '/uploads/placeholder.jpg'
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
}, {
  timestamps: true
});

// Индексы для быстрого поиска
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ categoryId: 1 });
productSchema.index({ categoryNumId: 1 });
productSchema.index({ subcategoryId: 1 });
productSchema.index({ subcategoryNumId: 1 });
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

export default mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema); 