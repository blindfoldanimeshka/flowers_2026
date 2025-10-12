import mongoose, { Schema, Document, Types } from 'mongoose';

// Интерфейс для категории
export interface ICategory extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  id: number;
  name: string;
  slug: string;
  image?: string;
  subcategories: Types.ObjectId[]; // Массив ID подкатегорий
  createdAt?: Date;
  updatedAt?: Date;
}

// Схема категории
const categorySchema = new Schema<ICategory>(
  {
    id: {
      type: Number,
      required: [true, 'ID категории обязателен'],
      unique: true,
      validate: {
        validator: function(v: any) {
          return Number.isInteger(v) && v > 0;
        },
        message: (props: any) => `ID категории должен быть положительным целым числом, получено ${props.value}`
      }
    },
    name: { 
      type: String, 
      required: [true, 'Название категории обязательно'] 
    },
    slug: { 
      type: String, 
      required: [true, 'Slug категории обязателен'],
      unique: true 
    },
    image: { 
      type: String,
      default: ''
    },
    subcategories: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'Subcategory' 
    }] // Массив ObjectId с ref на 'Subcategory'
  },
  {
    timestamps: true
  }
);

// Экспорт модели категории
const Category = mongoose.models.Category as mongoose.Model<ICategory> || mongoose.model<ICategory>('Category', categorySchema);

export default Category;

