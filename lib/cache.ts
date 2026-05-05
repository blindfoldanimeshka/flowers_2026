import { unstable_cache, revalidateTag } from 'next/cache';
import { supabase } from '@/lib/supabase';

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
const SETTINGS_KEY = 'global-settings';
const PAYMENT_SETTINGS_KEY = 'default';

function recordCacheAccess(key: string, revalidateSeconds: number) {
  const now = Date.now();
  const metric = cacheMetrics.get(key) || { hits: 0, misses: 0, lastAccessAt: 0, lastMissAt: 0 };
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

function createCacheKey(prefix: string, params: Record<string, unknown> = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${String(params[key])}`)
    .join('|');
  return sortedParams ? `${prefix}:${sortedParams}` : prefix;
}

function asNumber(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapProductRow(row: any) {
  const image = typeof row.image_url === 'string' ? row.image_url : '';
  const images = Array.isArray(row.images) ? row.images.filter((x: unknown) => typeof x === 'string') : [];
  const categoryId = typeof row.category_id === 'string' ? row.category_id : '';
  const categoryIds = Array.isArray(row.category_ids) ? row.category_ids.filter((x: unknown) => typeof x === 'string') : [];
  return {
    _id: row.id,
    name: row.name,
    description: row.description || '',
    price: asNumber(row.price),
    oldPrice: row.old_price ?? undefined,
    image,
    images: images.length > 0 ? images : (image ? [image] : []),
    inStock: row.in_stock ?? true,
    preorderOnly: row.preorder_only ?? false,
    assemblyTime: row.assembly_time || '',
    stockQuantity: asNumber(row.stock_quantity, 0),
    stockUnit: row.stock_unit || 'шт.',
    categoryId,
    categoryIds: categoryIds.length > 0 ? categoryIds : (categoryId ? [categoryId] : []),
    categoryNumId: asNumber(row.category_num_id, 0),
    subcategoryId: row.subcategory_id || '',
    subcategoryNumId: asNumber(row.subcategory_num_id, 0),
    pinnedInCategory: row.pinned_in_category || '',
  };
}

function mapSubcategoryRow(row: any) {
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    slug: row.slug,
    categoryId: row.category_id,
    categoryNumId: asNumber(row.category_num_id ?? row.categories?.legacy_id, 0),
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCategoryRow(row: any, subs: any[]) {
  return {
    _id: row.id,
    id: asNumber(row.legacy_id, 0),
    name: row.name,
    slug: row.slug,
    isActive: row.is_active ?? true,
    subcategories: subs,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrderRow(row: any) {
  const items = Array.isArray(row.order_items) ? row.order_items : [];
  return {
    _id: row.id,
    orderNumber: row.order_number,
    customer: {
      name: row.customer_name,
      email: row.customer_email || undefined,
      phone: row.customer_phone,
      address: row.customer_address,
    },
    items: items.map((item: any) => ({
      productId: item.product_id || '',
      name: item.product_name,
      price: asNumber(item.price),
      quantity: item.quantity,
      image: item.image_url || '',
    })),
    totalAmount: asNumber(row.total_amount),
    paymentMethod: row.payment_method,
    fulfillmentMethod: row.fulfillment_method,
    status: row.status,
    paymentStatus: row.payment_status,
    deliveryDate: row.delivery_date || undefined,
    deliveryTime: row.delivery_time || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getCacheStats() {
  return Array.from(cacheMetrics.entries()).map(([key, value]) => ({ key, ...value }));
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
  recordCacheAccess(cacheKey, 180);

  return unstable_cache(
    async () => {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      let query = supabase.from('products').select('*', { count: 'exact' });
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
      if (filters.subcategoryId) query = query.eq('subcategory_id', filters.subcategoryId);
      if (typeof filters.inStock === 'boolean') query = query.eq('in_stock', filters.inStock);
      if (filters.search) {
        const escaped = filters.search.replace(/[,%]/g, '').trim();
        if (escaped) query = query.or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%`);
      }

      const { data, error, count } = await query
        .order('sort_order', { ascending: true })
        .range((page - 1) * limit, page * limit - 1);
      if (error) return { products: [], pagination: { page, limit, total: 0, pages: 0 } };

      return {
        products: (data || []).map(mapProductRow),
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      };
    },
    [cacheKey],
    { revalidate: 180, tags: ['products'] }
  )();
}

export async function getCachedCategories() {
  recordCacheAccess('categories', 300);
  return unstable_cache(
    async () => {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('legacy_id', { ascending: true });
      if (categoriesError) return [];

      const { data: subcategories } = await supabase
        .from('subcategories')
        .select('*, categories(legacy_id)')
        .order('name', { ascending: true });
      const byCategory = new Map<string, any[]>();
      for (const sub of subcategories || []) {
        const categoryId = sub.category_id;
        const prev = byCategory.get(categoryId) || [];
        prev.push(mapSubcategoryRow(sub));
        byCategory.set(categoryId, prev);
      }
      return (categories || []).map((row) => mapCategoryRow(row, byCategory.get(row.id) || []));
    },
    ['categories'],
    { revalidate: 300, tags: ['categories'] }
  )();
}

export async function getCachedSubcategories(filters: { categoryId?: string; isActive?: boolean } = {}) {
  const cacheKey = createCacheKey('subcategories', filters);
  recordCacheAccess(cacheKey, 300);
  return unstable_cache(
    async () => {
      let query = supabase.from('subcategories').select('*, categories(legacy_id)').order('name', { ascending: true });
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
      if (typeof filters.isActive === 'boolean') query = query.eq('is_active', filters.isActive);
      const { data, error } = await query;
      if (error) return [];
      return (data || []).map(mapSubcategoryRow);
    },
    [cacheKey],
    { revalidate: 300, tags: ['subcategories'] }
  )();
}

export async function getCachedPaymentSettings() {
  recordCacheAccess('payment-settings', 3600);
  return unstable_cache(
    async () => {
      let { data, error } = await supabase.from('payment_settings').select('*').eq('id', PAYMENT_SETTINGS_KEY).maybeSingle();
      if (error || !data) {
        const fallback = await supabase.from('payment_settings').select('*').limit(1).maybeSingle();
        data = fallback.data;
      }
      if (!data) return null;
      return {
        isEnabled: data.is_enabled,
        currency: data.currency,
        stripe: data.stripe || {},
        yookassa: data.yookassa || {},
        sberbank: data.sberbank || {},
        cashOnDelivery: data.cash_on_delivery || {},
        cardOnDelivery: data.card_on_delivery || {},
        taxRate: asNumber(data.tax_rate),
        deliveryFee: asNumber(data.delivery_fee),
        freeDeliveryThreshold: asNumber(data.free_delivery_threshold),
      };
    },
    ['payment-settings'],
    { revalidate: 3600, tags: ['payment-settings'] }
  )();
}

export async function getCachedSettings() {
  recordCacheAccess('settings', 3600);
  return unstable_cache(
    async () => {
      let { data, error } = await supabase.from('settings').select('*').eq('id', SETTINGS_KEY).maybeSingle();
      if (error || !data) {
        const fallback = await supabase.from('settings').select('*').limit(1).maybeSingle();
        data = fallback.data;
      }
      if (!data) return null;
      return {
        siteName: data.site_name || '',
        siteDescription: data.site_description || '',
        contactPhone: data.contact_phone || '',
        address: data.address || '',
        workingHours: data.working_hours || '',
        deliveryRadius: asNumber(data.delivery_radius),
        minOrderAmount: asNumber(data.min_order_amount),
        freeDeliveryThreshold: asNumber(data.free_delivery_threshold),
        deliveryFee: asNumber(data.delivery_fee),
        currency: data.currency || 'RUB',
        timezone: data.timezone || 'Europe/Moscow',
        maintenanceMode: Boolean(data.maintenance_mode),
        seoTitle: data.seo_title || '',
        seoDescription: data.seo_description || '',
        seoKeywords: data.seo_keywords || '',
        socialLinks: data.social_links || {},
        pickupHours: data.pickup_hours || '09:00-20:00',
        deliveryHours: data.delivery_hours || '09:00-02:00',
        deliveryInfo: data.delivery_info || '',
        contactPhone2: data.contact_phone2 || '',
        contactPhone3: data.contact_phone3 || '',
        homeCategoryCardBackgrounds: data.home_category_card_backgrounds || {},
        homeBannerBackground: data.home_banner_background || '',
        homeBannerSlides: Array.isArray(data.home_banner_slides) ? data.home_banner_slides : [],
        mediaLibrary: Array.isArray(data.media_library) ? data.media_library : [],
      };
    },
    ['settings'],
    { revalidate: 3600, tags: ['settings'] }
  )();
}

export async function getCachedOrderStats() {
  recordCacheAccess('order-stats', 180);
  return unstable_cache(
    async () => {
      const { count: totalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      const { count: confirmedOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed');
      const { count: deliveredOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered');
      const { data: revenueRows } = await supabase.from('orders').select('total_amount');
      const totalRevenue = (revenueRows || []).reduce((sum: number, row: any) => sum + asNumber(row.total_amount), 0);

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const { count: recentOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastWeek.toISOString());

      return {
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        confirmedOrders: confirmedOrders || 0,
        deliveredOrders: deliveredOrders || 0,
        totalRevenue,
        recentOrders: recentOrders || 0,
      };
    },
    ['order-stats'],
    { revalidate: 180, tags: ['order-stats'] }
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
      let query = supabase.from('orders').select(
        `
          id,
          order_number,
          customer_name,
          customer_email,
          customer_phone,
          customer_address,
          status,
          payment_method,
          fulfillment_method,
          delivery_date,
          delivery_time,
          notes,
          total_amount,
          payment_status,
          created_at,
          updated_at,
          order_items (
            product_id,
            product_name,
            price,
            quantity,
            image_url
          )
        `,
        { count: 'exact' }
      );

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.email) query = query.eq('customer_email', filters.email);
      if (filters.deliveryType) query = query.eq('fulfillment_method', filters.deliveryType);

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      if (error) return { orders: [], pagination: { page, limit, total: 0, pages: 0 } };

      return {
        orders: (data || []).map(mapOrderRow),
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      };
    },
    [cacheKey],
    { revalidate: 30, tags: ['orders'] }
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
  return unstable_cache(fn, [prefix], {
    tags: options.tags || [prefix],
    revalidate: options.revalidate || 300,
  });
}
