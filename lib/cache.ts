import { escapeRegExp } from '@/lib/security';
import { unstable_cache, revalidateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface CacheOptions {
  tags?: string[];
  revalidate?: number;
}

interface CacheMetric {
  hits: number;
  misses: number;
  lastAccessAt: number;
  lastMissAt: number;
}

const cacheMetrics = new Map<string, CacheMetric>();

function recordCacheAccess(key: string, revalidateSeconds: number) {
  const now = Date.now();
  const metric = cacheMetrics.get(key) || {
    hits: 0,
    misses: 0,
    lastAccessAt: 0,
    lastMissAt: 0,
  };

  const expired = metric.lastMissAt === 0 || now - metric.lastMissAt > revalidateSeconds * 1000;
  if (expired) {
    metric.misses += 1;
    metric.lastMissAt = now;
  } else {
    metric.hits += 1;
  }

  metric.lastAccessAt = now;
  cacheMetrics.set(key, metric);
}

export function getCacheStats() {
  return Array.from(cacheMetrics.entries()).map(([key, value]) => ({ key, ...value }));
}

function createCacheKey(prefix: string, params: Record<string, any> = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return sortedParams ? `${prefix}:${sortedParams}` : prefix;
}

export async function getCachedProducts(filters: {
  categoryId?: string;
  subcategoryId?: string;
  inStock?: boolean;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const cacheKey = createCacheKey('products', filters);
  recordCacheAccess(cacheKey, 3 * 60);
  
  return unstable_cache(
    async () => {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      let queryBuilder = supabase
        .from('documents')
        .select('doc', { count: 'exact' })
        .eq('collection', 4);

      if (filters.categoryId) {
        queryBuilder = queryBuilder.eq('doc->>categoryId', filters.categoryId);
      }

      if (filters.subcategoryId) {
        queryBuilder = queryBuilder.eq('doc->>subcategoryId', filters.subcategoryId);
      }

      if (filters.inStock !== undefined) {
        queryBuilder = queryBuilder.eq('doc->>inStock', String(filters.inStock));
      }

      if (filters.search) {
        const escaped = escapeRegExp(filters.search);
        queryBuilder = queryBuilder.or(`doc->>name.ilike.%${escaped}%,doc->>description.ilike.%${escaped}%`);
      }

      const { data, error, count } = await queryBuilder
        .order('doc->>createdAt', { ascending: false })
        .range(skip, skip + limit - 1);

      if (error) {
        console.error('Error fetching cached products:', error);
        return {
          products: [],
          pagination: { page, limit, total: 0, pages: 0 }
        };
      }

      const products = (data || []).map(item => JSON.parse(item.doc));

      const categoryIds = [...new Set(products.map(p => p.categoryId).filter(Boolean))];
      const subcategoryIds = [...new Set(products.map(p => p.subcategoryId).filter(Boolean))];

      const { data: categories } = categoryIds.length > 0
        ? await supabase
            .from('documents')
            .select('doc')
            .eq('collection', 2)
            .in('id', categoryIds)
        : { data: [] };

      const { data: subcategories } = subcategoryIds.length > 0
        ? await supabase
            .from('documents')
            .select('doc')
            .eq('collection', 3)
            .in('id', subcategoryIds)
        : { data: [] };

      const categoryMap = new Map(
        (categories || []).map(c => {
          const cat = JSON.parse(c.doc);
          return [cat.id, cat];
        })
      );

      const subcategoryMap = new Map(
        (subcategories || []).map(s => {
          const sub = JSON.parse(s.doc);
          return [sub.id, sub];
        })
      );

      const populatedProducts = products.map(product => ({
        ...product,
        categoryId: product.categoryId ? {
          name: categoryMap.get(product.categoryId)?.name,
          slug: categoryMap.get(product.categoryId)?.slug
        } : undefined,
        subcategoryId: product.subcategoryId ? {
          name: subcategoryMap.get(product.subcategoryId)?.name,
          slug: subcategoryMap.get(product.subcategoryId)?.slug
        } : undefined
      }));

      return {
        products: populatedProducts,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      };
    },
    [cacheKey],
    {
      revalidate: 180,
      tags: ['products']
    }
  )();
}

export async function getCachedCategories() {
  recordCacheAccess('categories', 5 * 60);

  return unstable_cache(
    async () => {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('documents')
        .select('doc')
        .eq('collection', 2)
        .order('doc->>name', { ascending: true });

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        return [];
      }

      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('documents')
        .select('doc')
        .eq('collection', 3);

      if (subcategoriesError) {
        console.error('Error fetching subcategories:', subcategoriesError);
      }

      const categories = (categoriesData || []).map(item => JSON.parse(item.doc));
      const allSubcategories = (subcategoriesData || []).map(item => JSON.parse(item.doc));

      const subcategoryMap = new Map(
        allSubcategories.map(sub => [sub.id, sub])
      );

      const populatedCategories = categories.map(category => {
        const categorySubcategories = Array.isArray(category.subcategories)
          ? category.subcategories
              .map(subId => subcategoryMap.get(subId))
              .filter(Boolean)
          : [];

        return {
          ...category,
          subcategories: categorySubcategories
        };
      });

      return populatedCategories;
    },
    ['categories'],
    {
      revalidate: 300,
      tags: ['categories']
    }
  )();
}

export async function getCachedPaymentSettings() {
  recordCacheAccess('payment-settings', 60 * 60);

  return unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('doc')
        .eq('collection', 7)
        .eq('doc->>settingKey', 'payment-settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching payment settings:', error);
        return null;
      }

      if (!data) {
        const defaultSettings = {
          settingKey: 'payment-settings',
          stripe: { enabled: false, publishableKey: '', secretKey: '' },
          yookassa: { enabled: false, shopId: '', secretKey: '' },
          sberbank: { enabled: false, merchantId: '', apiKey: '' },
          cashOnDelivery: { enabled: true },
          cardOnDelivery: { enabled: true }
        };

        const { data: inserted, error: insertError } = await supabase
          .from('documents')
          .insert([{ collection: 7, doc: JSON.stringify(defaultSettings) }])
          .select('doc')
          .single();

        if (insertError) {
          console.error('Error creating default payment settings:', insertError);
          return defaultSettings;
        }

        return JSON.parse(inserted.doc);
      }

      return JSON.parse(data.doc);
    },
    ['payment-settings'],
    {
      revalidate: 3600,
      tags: ['payment-settings']
    }
  )();
}

export async function getCachedSettings() {
  recordCacheAccess('settings', 60 * 60);

  return unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('doc')
        .eq('collection', 7)
        .eq('doc->>settingKey', 'global-settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        return null;
      }

      if (data) {
        return JSON.parse(data.doc);
      }

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('documents')
        .select('doc')
        .eq('collection', 7)
        .limit(1)
        .maybeSingle();

      if (fallbackError) {
        console.error('Error fetching fallback settings:', fallbackError);
        return null;
      }

      return fallbackData ? JSON.parse(fallbackData.doc) : null;
    },
    ['settings'],
    {
      revalidate: 3600,
      tags: ['settings']
    }
  )();
}

export async function getCachedOrderStats() {
  recordCacheAccess('order-stats', 3 * 60);

  return unstable_cache(
    async () => {
      const { count: totalOrders, error: totalError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('collection', 5);

      if (totalError) console.error('Error counting total orders:', totalError);

      const { count: pendingOrders, error: pendingError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('collection', 5)
        .eq('doc->>status', 'pending');

      if (pendingError) console.error('Error counting pending orders:', pendingError);

      const { count: confirmedOrders, error: confirmedError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('collection', 5)
        .eq('doc->>status', 'confirmed');

      if (confirmedError) console.error('Error counting confirmed orders:', confirmedError);

      const { count: deliveredOrders, error: deliveredError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('collection', 5)
        .eq('doc->>status', 'delivered');

      if (deliveredError) console.error('Error counting delivered orders:', deliveredError);

      const { data: ordersData, error: revenueError } = await supabase
        .from('documents')
        .select('doc')
        .eq('collection', 5);

      if (revenueError) console.error('Error fetching orders for revenue:', revenueError);

      const totalRevenue = (ordersData || []).reduce((sum, item) => {
        const order = JSON.parse(item.doc);
        return sum + (order.totalAmount || 0);
      }, 0);

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekISO = lastWeek.toISOString();

      const { count: recentOrders, error: recentError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('collection', 5)
        .gte('doc->>createdAt', lastWeekISO);

      if (recentError) console.error('Error counting recent orders:', recentError);

      return {
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        confirmedOrders: confirmedOrders || 0,
        deliveredOrders: deliveredOrders || 0,
        totalRevenue,
        recentOrders: recentOrders || 0
      };
    },
    ['order-stats'],
    {
      revalidate: 180,
      tags: ['order-stats']
    }
  )();
}

export async function getCachedOrders(filters: {
  email?: string;
  status?: string;
  deliveryType?: string;
  page?: number;
  limit?: number;
} = {}) {
  const cacheKey = createCacheKey('orders', filters);
  recordCacheAccess(cacheKey, 30);
  
  return unstable_cache(
    async () => {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      let queryBuilder = supabase
        .from('documents')
        .select('doc', { count: 'exact' })
        .eq('collection', 5);

      if (filters.status) {
        queryBuilder = queryBuilder.eq('doc->>status', filters.status);
      }

      if (filters.email) {
        queryBuilder = queryBuilder.eq('doc->customer->>email', filters.email);
      }

      if (filters.deliveryType) {
        queryBuilder = queryBuilder.eq('doc->>fulfillmentMethod', filters.deliveryType);
      }

      const { data, error, count } = await queryBuilder
        .order('doc->>createdAt', { ascending: false })
        .range(skip, skip + limit - 1);

      if (error) {
        console.error('Error fetching cached orders:', error);
        return {
          orders: [],
          pagination: { page, limit, total: 0, pages: 0 }
        };
      }

      const orders = (data || []).map(item => JSON.parse(item.doc));

      const productIds = orders.flatMap(order => 
        (order.items || []).map(item => item.productId).filter(Boolean)
      );

      const { data: productsData, error: productsError } = productIds.length > 0
        ? await supabase
            .from('documents')
            .select('doc')
            .eq('collection', 4)
            .in('id', productIds)
        : { data: [] };

      if (productsError) {
        console.error('Error populating order products:', productsError);
      }

      const productMap = new Map(
        (productsData || []).map(p => {
          const product = JSON.parse(p.doc);
          return [product.id, product];
        })
      );

      const populatedOrders = orders.map(order => ({
        ...order,
        items: (order.items || []).map(item => ({
          ...item,
          productId: item.productId ? {
            name: productMap.get(item.productId)?.name,
            price: productMap.get(item.productId)?.price,
            image: productMap.get(item.productId)?.image
          } : undefined
        }))
      }));

      return {
        orders: populatedOrders,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      };
    },
    [cacheKey],
    {
      revalidate: 30,
      tags: ['orders']
    }
  )();
}

export async function getCachedSubcategories(filters: {
  categoryId?: string;
  categoryNumId?: number;
  isActive?: boolean;
} = {}) {
  const cacheKey = createCacheKey('subcategories', filters);
  recordCacheAccess(cacheKey, 5 * 60);
  
  return unstable_cache(
    async () => {
      let queryBuilder = supabase
        .from('documents')
        .select('doc')
        .eq('collection', 3);

      if (filters.categoryId) {
        queryBuilder = queryBuilder.eq('doc->>categoryId', filters.categoryId);
      }

      if (filters.categoryNumId !== undefined) {
        queryBuilder = queryBuilder.eq('doc->>categoryNumId', filters.categoryNumId);
      }

      if (filters.isActive !== undefined) {
        queryBuilder = queryBuilder.eq('doc->>isActive', String(filters.isActive));
      }

      const { data, error } = await queryBuilder
        .order('doc->>name', { ascending: true });

      if (error) {
        console.error('Error fetching subcategories:', error);
        return [];
      }

      const subcategories = (data || []).map(item => JSON.parse(item.doc));

      const categoryIds = [...new Set(subcategories.map(sub => sub.categoryId).filter(Boolean))];

      const { data: categoriesData, error: categoriesError } = categoryIds.length > 0
        ? await supabase
            .from('documents')
            .select('doc')
            .eq('collection', 2)
            .in('id', categoryIds)
        : { data: [] };

      if (categoriesError) {
        console.error('Error populating subcategory categories:', categoriesError);
      }

      const categoryMap = new Map(
        (categoriesData || []).map(c => {
          const cat = JSON.parse(c.doc);
          return [cat.id, cat];
        })
      );

      return subcategories.map(subcat => ({
        ...subcat,
        categoryId: subcat.categoryId ? {
          name: categoryMap.get(subcat.categoryId)?.name,
          slug: categoryMap.get(subcat.categoryId)?.slug
        } : undefined
      }));
    },
    [cacheKey],
    {
      revalidate: 300,
      tags: ['subcategories']
    }
  )();
}

export function invalidateSettingsCache() {
  revalidateTag('settings', 'max');
}

export function invalidateProductsCache() {
  revalidateTag('products', 'max');
}

export function invalidateCategoriesCache() {
  revalidateTag('categories', 'max');
}

export function invalidatePaymentSettingsCache() {
  revalidateTag('payment-settings', 'max');
}

export function invalidateOrderStatsCache() {
  revalidateTag('order-stats', 'max');
}

export function invalidateOrdersCache() {
  revalidateTag('orders', 'max');
}

export function invalidateSubcategoriesCache() {
  revalidateTag('subcategories', 'max');
}

export function invalidateAllCache() {
  invalidateSettingsCache();
  invalidateProductsCache();
  invalidateCategoriesCache();
  invalidatePaymentSettingsCache();
  invalidateOrderStatsCache();
  invalidateOrdersCache();
  invalidateSubcategoriesCache();
}

export function createCustomCache<T>(
  fn: (...args: any[]) => Promise<T>,
  prefix: string,
  options: CacheOptions = {}
) {
  return unstable_cache(
    fn,
    [prefix],
    {
      tags: options.tags || [prefix],
      revalidate: options.revalidate || 300
    }
  );
}
