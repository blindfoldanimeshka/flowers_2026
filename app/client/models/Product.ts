export interface IProduct {
  _id: string;
  name: string;
  price: number;
  description?: string;
  image: string;
  images?: string[];
  inStock?: boolean;
  preorderOnly?: boolean;
  assemblyTime?: string;
  stockQuantity?: number;
  stockUnit?: string;
  categoryId?: string;
  categoryNumId?: number;
  subcategoryId?: string;
  subcategoryNumId?: number;
}
