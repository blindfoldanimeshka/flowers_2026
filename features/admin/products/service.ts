import { IProduct } from '@/app/client/models/Product';
import { ICategory } from '@/app/client/models/Category';
import { withCsrfHeaders } from '@/lib/csrf-client';

function normalizeProductsResponse(data: unknown): IProduct[] {
  if (Array.isArray(data)) return data as IProduct[];
  if (data && typeof data === 'object' && 'products' in data && Array.isArray((data as any).products)) {
    return (data as any).products;
  }
  return [];
}

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

async function fetchProducts(url: string): Promise<IProduct[]> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch products. Status: ${response.status}`);
  return normalizeProductsResponse(await response.json());
}

export async function getAllProducts(): Promise<IProduct[]> {
  return fetchProducts('/api/products');
}

export async function createProduct(payload: Omit<IProduct, '_id'>): Promise<IProduct> {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create product'));
  return response.json();
}

export async function updateProduct(id: string, payload: Omit<IProduct, '_id'>): Promise<IProduct> {
  const response = await fetch(`/api/products/${id}`, {
    method: 'PUT',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update product'));
  return response.json();
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`/api/products/${id}`, {
    method: 'DELETE',
    headers: withCsrfHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to delete product'));
}

export async function getAllCategories(): Promise<ICategory[]> {
  const response = await fetch('/api/categories', { cache: 'no-store' });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch categories'));
  const data = await response.json();
  return Array.isArray(data) ? data : [data];
}

