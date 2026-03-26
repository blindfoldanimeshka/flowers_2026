import { createSupabaseModel } from '@/lib/supabaseModel';

export interface IProduct {
  _id: string;
  name: string;
  price: number;
  categoryId: string;
  categoryNumId: number;
  subcategoryId?: string;
  subcategoryNumId?: number;
  image: string;
  images?: string[];
  description: string;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

const Product = createSupabaseModel({
  collection: 'products',
  defaults: { inStock: true, image: '/uploads/placeholder.jpg' },
  references: {
    categoryId: 'categories',
    subcategoryId: 'subcategories',
  },
});

export default Product;
