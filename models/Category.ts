import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import slugify from 'slugify';

export interface ICategory extends Document {
  id: number;
  name: string;
  slug: string;
  isActive?: boolean;
  subcategories: Array<Types.ObjectId | Record<string, unknown>>;
}

const CategorySchema: Schema<ICategory> = new Schema(
  {
    id: {
      type: Number,
      required: [true, 'ID category is required'],
      unique: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: (props: { value: number }) =>
          `Category ID must be a positive integer, got ${props.value}`,
      },
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    subcategories: {
      type: [Schema.Types.Mixed] as any,
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

CategorySchema.pre('save', function (next) {
  if (!this.slug && this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }

  next();
});

const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
export { Category };
