import mongoose from 'mongoose';
import slugify from 'slugify';

const subcategorySchema = new mongoose.Schema({
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
    // @ts-ignore
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

const Subcategory = mongoose.models.Subcategory || mongoose.model('Subcategory', subcategorySchema);

export default Subcategory; 