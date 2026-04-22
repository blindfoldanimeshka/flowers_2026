import { createSupabaseModel } from '@/lib/supabaseModel';

export interface IProduct {
  _id: string;
  name: string;
  price: number;
  categoryId: string; // Оставляем для обратной совместимости
  categoryIds: string[]; // Новое поле - массив категорий
  categoryNumId: number;
  subcategoryId?: string;
  subcategoryNumId?: number;
  image: string;
  images?: string[];
  description: string;
  inStock: boolean;
  preorderOnly?: boolean;
  assemblyTime?: string;
  stockQuantity?: number;
  stockUnit?: string;
  pinnedInCategory?: string; // ID категории, в которой товар закреплен
  createdAt: string;
  updatedAt: string;
}

const Product = createSupabaseModel({
  collection: 'products',
  defaults: {
    inStock: true,
    image: '/uploads/placeholder.jpg',
    preorderOnly: false,
    assemblyTime: '',
    stockQuantity: 0,
    stockUnit: 'шт.',
    categoryIds: [], // Массив категорий по умолчанию пустой
  },
  references: {
    categoryId: 'categories',
    subcategoryId: 'subcategories',
  },
});

export default Product;
