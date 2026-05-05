import { ICategory, ICategoryWithStats, ISubcategory } from '@/app/client/models/Category';
import { IProduct } from '@/app/client/models/Product';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const TTL_MS = {
  categories: 60_000,
  categoryBySlug: 60_000,
  subcategoryBySlug: 60_000,
  products: 45_000,
  stats: 30_000,
} as const;

const categoryListCache = new Map<string, CacheEntry<ICategory[]>>();
const categoryBySlugCache = new Map<string, CacheEntry<ICategory | null>>();
const subcategoryBySlugCache = new Map<string, CacheEntry<ISubcategory | null>>();
const productsCache = new Map<string, CacheEntry<IProduct[]>>();
const categoriesStatsCache = new Map<string, CacheEntry<ICategoryWithStats[]>>();
const DISABLE_CLIENT_CACHE =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_DISABLE_CLIENT_CACHE === 'true';

let getAllCategoriesInflight: Promise<ICategory[]> | null = null;
const categoryBySlugInflight = new Map<string, Promise<ICategory | null>>();
const subcategoryBySlugInflight = new Map<string, Promise<ISubcategory | null>>();
const productsInflight = new Map<string, Promise<IProduct[]>>();
let categoriesStatsInflight: Promise<ICategoryWithStats[]> | null = null;

type ProductsEnvelope = {
  products: unknown;
};

function getCachedValue<T>(store: Map<string, CacheEntry<T>>, key: string): T | null {
  if (DISABLE_CLIENT_CACHE) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function hasValidCache<T>(store: Map<string, CacheEntry<T>>, key: string): boolean {
  if (DISABLE_CLIENT_CACHE) return false;
  const entry = store.get(key);
  if (!entry) return false;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return false;
  }
  return true;
}

function setCachedValue<T>(store: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): T {
  if (DISABLE_CLIENT_CACHE) return value;
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

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
  if (
    data &&
    typeof data === 'object' &&
    'products' in data &&
    Array.isArray((data as ProductsEnvelope).products)
  ) {
    return (data as ProductsEnvelope).products as IProduct[];
  }
  return [];
}

async function fetchProducts(url: string): Promise<IProduct[]> {
  const catalogUrl = url.includes('?') ? `${url}&view=catalog` : `${url}?view=catalog`;
  if (!DISABLE_CLIENT_CACHE) {
    const cached = getCachedValue(productsCache, catalogUrl);
    if (cached) return cached;
  }

  if (!DISABLE_CLIENT_CACHE) {
    const inflight = productsInflight.get(catalogUrl);
    if (inflight) return inflight;
  }

  const request = (async () => {
    const response = await fetch(catalogUrl, { cache: DISABLE_CLIENT_CACHE ? 'no-store' : 'default' });
    if (!response.ok) throw new Error(`Failed to fetch products. Status: ${response.status}`);
    const products = normalizeProductsResponse(await response.json());
    return setCachedValue(productsCache, catalogUrl, products, TTL_MS.products);
  })().finally(() => {
    if (!DISABLE_CLIENT_CACHE) {
      productsInflight.delete(catalogUrl);
    }
  });

  if (!DISABLE_CLIENT_CACHE) {
    productsInflight.set(catalogUrl, request);
  }
  return request;
}

export async function getAllCategories(): Promise<ICategory[]> {
  const cacheKey = 'all';
  const cached = getCachedValue(categoryListCache, cacheKey);
  if (cached) return cached;

  if (getAllCategoriesInflight) return getAllCategoriesInflight;

  getAllCategoriesInflight = (async () => {
    const response = await fetch('/api/categories', { cache: DISABLE_CLIENT_CACHE ? 'no-store' : 'default' });
    const data = await parseJson<ICategory[] | ICategory>(response);
    const categories = Array.isArray(data) ? data : [data];
    return setCachedValue(categoryListCache, cacheKey, categories, TTL_MS.categories);
  })().finally(() => {
    getAllCategoriesInflight = null;
  });

  return getAllCategoriesInflight;
}

export async function getCategoryBySlug(slug: string): Promise<ICategory | null> {
  const cacheKey = slug.trim().toLowerCase();
  if (hasValidCache(categoryBySlugCache, cacheKey)) {
    return getCachedValue(categoryBySlugCache, cacheKey) as ICategory | null;
  }

  const inflight = categoryBySlugInflight.get(cacheKey);
  if (inflight) return inflight;

  const request = (async () => {
    const response = await fetch(`/api/categories?slug=${encodeURIComponent(slug)}`, { cache: DISABLE_CLIENT_CACHE ? 'no-store' : 'default' });
    if (response.status === 404) {
      return setCachedValue(categoryBySlugCache, cacheKey, null, TTL_MS.categoryBySlug);
    }
    const category = await parseJson<ICategory>(response);
    return setCachedValue(categoryBySlugCache, cacheKey, category, TTL_MS.categoryBySlug);
  })().finally(() => {
    categoryBySlugInflight.delete(cacheKey);
  });

  categoryBySlugInflight.set(cacheKey, request);
  return request;
}

export async function getSubcategoryBySlug(slug: string): Promise<ISubcategory | null> {
  const cacheKey = slug.trim().toLowerCase();
  if (hasValidCache(subcategoryBySlugCache, cacheKey)) {
    return getCachedValue(subcategoryBySlugCache, cacheKey) as ISubcategory | null;
  }

  const inflight = subcategoryBySlugInflight.get(cacheKey);
  if (inflight) return inflight;

  const request = (async () => {
    const response = await fetch(`/api/subcategories?slug=${encodeURIComponent(slug)}`, { cache: DISABLE_CLIENT_CACHE ? 'no-store' : 'default' });
    if (response.status === 404) {
      return setCachedValue(subcategoryBySlugCache, cacheKey, null, TTL_MS.subcategoryBySlug);
    }
    const subcategory = await parseJson<ISubcategory>(response);
    return setCachedValue(subcategoryBySlugCache, cacheKey, subcategory, TTL_MS.subcategoryBySlug);
  })().finally(() => {
    subcategoryBySlugInflight.delete(cacheKey);
  });

  subcategoryBySlugInflight.set(cacheKey, request);
  return request;
}

export async function getAllProducts(): Promise<IProduct[]> {
  return fetchProducts('/api/products');
}

export async function getProductsByCategory(categoryId: string): Promise<IProduct[]> {
  return fetchProducts(`/api/products?categoryId=${encodeURIComponent(categoryId)}`);
}

export async function getProductsBySubcategory(subcategoryId: string): Promise<IProduct[]> {
  return fetchProducts(`/api/products?subcategoryId=${encodeURIComponent(subcategoryId)}`);
}

export async function getCategoriesWithStats(): Promise<ICategoryWithStats[]> {
  const cacheKey = 'all';
  const cached = getCachedValue(categoriesStatsCache, cacheKey);
  if (cached) return cached;

  if (categoriesStatsInflight) return categoriesStatsInflight;

  categoriesStatsInflight = (async () => {
    const response = await fetch('/api/categories/stats', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: DISABLE_CLIENT_CACHE ? 'no-store' : 'default',
    });
    const data = await parseJson<{ success: boolean; categories: ICategoryWithStats[]; error?: string }>(response);
    if (!data.success) throw new Error(data.error || 'Failed to load categories stats');
    return setCachedValue(categoriesStatsCache, cacheKey, data.categories || [], TTL_MS.stats);
  })().finally(() => {
    categoriesStatsInflight = null;
  });

  return categoriesStatsInflight;
}

export function invalidateProductsClientCache() {
  productsCache.clear();
  productsInflight.clear();
}

export function invalidateCategoriesClientCache() {
  categoryListCache.clear();
  categoryBySlugCache.clear();
  subcategoryBySlugCache.clear();
  categoriesStatsCache.clear();
  getAllCategoriesInflight = null;
  categoriesStatsInflight = null;
  categoryBySlugInflight.clear();
  subcategoryBySlugInflight.clear();
}
