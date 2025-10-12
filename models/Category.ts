import mongoose, { Document, Model, Schema } from 'mongoose';
import slugify from 'slugify';

export interface ICategory extends Document {
  id: number;
  name: string;
  slug: string;
  subcategories: mongoose.Types.ObjectId[];
}

const CategorySchema: Schema<ICategory> = new Schema(
  {
    id: {
      type: Number,
      required: [true, 'ID категории обязателен'],
      unique: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: (props: any) => `ID категории должен быть положительным целым числом, получено ${props.value}`,
      },
    },
    name: {
      type: String,
      required: [true, 'Название категории обязательно'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    subcategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subcategory',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save хук для генерации slug только если он не установлен
CategorySchema.pre('save', function (next) {
  // Генерируем slug только если он не установлен и имя изменилось
  if (!this.slug && this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category; 