import { ICategory, ICategoryWithStats, ISubcategory } from '@/app/client/models/Category';
import { withCsrfHeaders } from '@/lib/csrf-client';

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

export async function getAllCategories(): Promise<ICategory[]> {
  const response = await fetch('/api/categories', { cache: 'no-store' });
  const data = await parseJson<ICategory[] | ICategory>(response);
  return Array.isArray(data) ? data : [data];
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

export async function getCategoriesWithStats(): Promise<ICategoryWithStats[]> {
  const response = await fetch('/api/categories/stats', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  const data = await parseJson<{ success: boolean; categories: ICategoryWithStats[]; error?: string }>(response);
  if (!data.success) throw new Error(data.error || 'Failed to load categories stats');
  return data.categories || [];
}

export async function createCategory(name: string) {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  });
  return parseJson(response);
}

export async function createSubcategory(name: string, categoryId: string) {
  const response = await fetch('/api/subcategories', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, categoryId }),
  });
  return parseJson(response);
}

export async function updateCategoryName(id: string, name: string) {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  });
  return parseJson(response);
}

export async function updateSubcategoryName(id: string, name: string) {
  const response = await fetch(`/api/subcategories/${id}`, {
    method: 'PUT',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  });
  return parseJson(response);
}

export async function deleteCategory(id: string, force = false) {
  return parseJson(
    await fetch(`/api/categories/${id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
      headers: withCsrfHeaders(),
    })
  );
}

export async function deleteSubcategory(id: string, force = false) {
  return parseJson(
    await fetch(`/api/subcategories/${id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
      headers: withCsrfHeaders(),
    })
  );
}

