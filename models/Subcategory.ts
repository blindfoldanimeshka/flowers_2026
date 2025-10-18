import mongoose, { Document } from 'mongoose';
import slugify from 'slugify';

export interface ISubcategory extends Document {
  name: string;
  slug: string;
  categoryId: mongoose.Types.ObjectId;
  categoryNumId: number;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subcategorySchema = new mongoose.Schema<ISubcategory>({
  name: {
    type: String,
    required: [true, 'Название подкатегории обязательно'],
    trim: true,
    maxlength: [100, 'Название подкатегории не может быть длиннее 100 символов']
  },
  slug: {
    type: String,
    lowercase: true,
    trim: true,
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
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Описание не может быть длиннее 500 символов']
  },
  image: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

subcategorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    // @ts-expect-error - slugify может не иметь типов для this.name
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Индекс для быстрого поиска по категории
subcategorySchema.index({ categoryId: 1 });

// Виртуальное поле для ID подкатегории (для совместимости)
subcategorySchema.virtual('id').get(function() {
  return this._id;
});

// Убеждаемся, что виртуальные поля включаются в JSON
subcategorySchema.set('toJSON', { virtuals: true });
subcategorySchema.set('toObject', { virtuals: true });

const Subcategory = mongoose.models.Subcategory || mongoose.model<ISubcategory>('Subcategory', subcategorySchema);

export default Subcategory; 