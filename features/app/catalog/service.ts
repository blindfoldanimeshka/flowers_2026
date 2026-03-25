import { ICategory, ICategoryWithStats, ISubcategory } from '@/app/client/models/Category';
import { IProduct } from '@/app/client/models/Product';

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
}

function normalizeProductsResponse(data: unknown): IProduct[] {
  if (Array.isArray(data)) return data as IProduct[];
  if (data && typeof data === 'object' && 'products' in data && Array.isArray((data as any).products)) return (data as any).products;
  return [];
}

async function fetchProducts(url: string): Promise<IProduct[]> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch products. Status: ${response.status}`);
  return normalizeProductsResponse(await response.json());
}

/** Один параллельный запрос на главной: CategoryGrid и HomeCatalogSection больше не дублируют GET. */
let getAllCategoriesInflight: Promise<ICategory[]> | null = null;

export async function getAllCategories(): Promise<ICategory[]> {
  if (getAllCategoriesInflight) return getAllCategoriesInflight;
  getAllCategoriesInflight = (async () => {
    const response = await fetch('/api/categories', { cache: 'no-store' });
    const data = await parseJson<ICategory[] | ICategory>(response);
    return Array.isArray(data) ? data : [data];
  })().finally(() => {
    getAllCategoriesInflight = null;
  });
  return getAllCategoriesInflight;
}

export async function getCategoryBySlug(slug: string): Promise<ICategory | null> {
  const response = await fetch(`/api/categories?slug=${slug}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  return parseJson<ICategory>(response);
}

export async function getSubcategoryBySlug(slug: string): Promise<ISubcategory | null> {
  const response = await fetch(`/api/subcategories?slug=${slug}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  return parseJson<ISubcategory>(response);
}

export async function getAllProducts(): Promise<IProduct[]> { return fetchProducts('/api/products'); }
export async function getProductsByCategory(categoryId: string): Promise<IProduct[]> { return fetchProducts(`/api/products?categoryId=${categoryId}`); }
export async function getProductsBySubcategory(subcategoryId: string): Promise<IProduct[]> { return fetchProducts(`/api/products?subcategoryId=${subcategoryId}`); }

export async function getCategoriesWithStats(): Promise<ICategoryWithStats[]> {
  const response = await fetch('/api/categories/stats', { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
  const data = await parseJson<{ success: boolean; categories: ICategoryWithStats[]; error?: string }>(response);
  if (!data.success) throw new Error(data.error || 'Failed to load categories stats');
  return data.categories || [];
}

