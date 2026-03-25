export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface SubcategoryBase {
  name: string;
  slug: string;
  categoryId: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface SubcategoryDocument extends SubcategoryBase {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubcategoryDto {
  name: string;
  categoryId: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface UpdateSubcategoryDto extends Partial<CreateSubcategoryDto> {
  id: string;
}

export interface ListSubcategoriesParams {
  categoryId?: string;
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}
