export interface IProduct {
  _id: string;
  name: string;
  price: number;
  description?: string;
  image: string;
  images?: string[];
  inStock?: boolean;
  categoryId?: string;
  categoryNumId?: number;
  subcategoryId?: string;
  subcategoryNumId?: number;
}
