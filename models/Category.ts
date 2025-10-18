import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import slugify from 'slugify';

// Interface for embedded subcategory subdocuments
export interface ISubcategorySubdocument {
  _id?: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICategory extends Document {
  id: number;
  name: string;
  slug: string;
  isActive?: boolean;
  subcategories: Types.DocumentArray<ISubcategorySubdocument>;
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
    subcategories: {
      type: [{
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
      }],
      validate: {
        validator: function(subcategories: any[]) {
          // First reject non-arrays
          if (!Array.isArray(subcategories)) return false;
          
          // Validate uniqueness of subcategory names (before slug generation)
          const names = subcategories
            .map(sub => sub.name)
            .filter(name => name && typeof name === 'string')
            .map(name => name.trim().toLowerCase())
            .filter(name => name.length > 0);
          
          // Check for duplicate names using Set size comparison
          const uniqueNames = new Set(names);
          
          // Return true only if all names are unique
          return uniqueNames.size === names.length;
        },
        message: 'Subcategory names must be unique within a category'
      }
    },
    isActive: {
      type: Boolean,
      default: true,
      required: false
    },
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
  
  // Генерируем slug для подкатегорий
  if (this.isModified('subcategories')) {
    this.subcategories.forEach((subcategory) => {
      // Generate slug if subcategory lacks a slug
      // This will handle both new subcategories and existing ones without slugs
      if (!subcategory.slug) {
        subcategory.slug = slugify(subcategory.name, { lower: true, strict: true });
      }
    });
  }
  
  next();
});

const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
export { Category }; 