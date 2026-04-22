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
  categoryId?: string; // Оставляем для обратной совместимости
  categoryIds?: string[]; // Новое поле - массив категорий
  categoryNumId?: number;
  subcategoryId?: string;
  subcategoryNumId?: number;
  pinnedInCategory?: string; // ID категории, в которой товар закреплен
}
