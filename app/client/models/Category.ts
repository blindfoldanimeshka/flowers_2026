export interface ISubcategory {
  _id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryNumId: number;
  description?: string;
  image?: string;
  isActive: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICategory {
  _id: string;
  id: number;
  name: string;
  slug: string;
  image?: string;
  order?: number;
  subcategories: ISubcategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ICategoryWithStats extends ICategory {
  productCount?: number;
  subcategoriesProductCount?: number;
  totalProductCount?: number;
}
