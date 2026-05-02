import { escapeRegExp } from '@/lib/security';
import { unstable_cache, revalidateTag } from 'next/cache';
import Settings from '@/models/Settings';
import dbConnect from './db';

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
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: Product } = await import('@/models/Product');
      
      await dbConnect();
      
      const query: any = {};
      
      if (filters.categoryId) {
        query.categoryId = filters.categoryId;
      }
      
      if (filters.subcategoryId) {
        query.subcategoryId = filters.subcategoryId;
      }
      
      if (filters.inStock !== undefined) {
        query.inStock = filters.inStock;
      }
      
      if (filters.search) {
        const escaped = escapeRegExp(filters.search);
        query.$or = [
          { name: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } }
        ];
      }
      
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;
      
      const totalProducts = await Product.countDocuments(query);
      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name slug')
        .populate('subcategoryId', 'name slug');
      
      return {
        products,
        pagination: {
          page,
          limit,
          total: totalProducts,
          pages: Math.ceil(totalProducts / limit)
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
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: Category } = await import('@/models/Category');
      const { default: Subcategory } = await import('@/models/Subcategory');
      
      await dbConnect();
      
      const [categories, allSubcategories] = await Promise.all([
        Category.find().sort({ name: 1 }).lean(),
        Subcategory.find().lean(),
      ]);
      
      const subcategoryMap = new Map(
        allSubcategories.map(sub => [String(sub._id), sub])
      );
      
      const populatedCategories = categories.map(category => {
        const categorySubcategories = Array.isArray(category.subcategories)
          ? category.subcategories
              .map(subId => {
                const subIdStr = subId.toString();
                const sub = subcategoryMap.get(subIdStr);
                return sub;
              })
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
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: PaymentSettings } = await import('@/models/PaymentSettings');
      
      await dbConnect();
      
      let settings = await PaymentSettings.findOne();
      
      if (!settings) {
        settings = await PaymentSettings.create({
          stripe: { enabled: false, publishableKey: '', secretKey: '' },
          yookassa: { enabled: false, shopId: '', secretKey: '' },
          sberbank: { enabled: false, merchantId: '', apiKey: '' },
          cashOnDelivery: { enabled: true },
          cardOnDelivery: { enabled: true }
        });
      }
      
      return {
        ...settings.toObject()
      };
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
      await dbConnect();
      const settings = await Settings.findOne({ settingKey: 'global-settings' }) || await Settings.findOne();
      return settings ? settings.toObject() : null;
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
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: Order } = await import('@/models/Order');
      
      await dbConnect();
      
      const totalOrders = await Order.countDocuments();
      const pendingOrders = await Order.countDocuments({ status: 'pending' });
      const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
      const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
      
      const totalRevenue = await Order.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const recentOrders = await Order.countDocuments({
        createdAt: { $gte: lastWeek }
      });
      
      return {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        deliveredOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentOrders
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
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: Order } = await import('@/models/Order');
      
      await dbConnect();
      
      const query: any = {};
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.email) {
        query['customer.email'] = filters.email;
      }
      
      if (filters.deliveryType) {
        query.fulfillmentMethod = filters.deliveryType;
      }
      
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;
      
      const totalOrders = await Order.countDocuments(query);
      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.productId', 'name price image');
      
      return {
        orders,
        pagination: {
          page,
          limit,
          total: totalOrders,
          pages: Math.ceil(totalOrders / limit)
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
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: Subcategory } = await import('@/models/Subcategory');
      
      await dbConnect();
      
      const query: any = {};
      
      if (filters.categoryId) {
        query.categoryId = filters.categoryId;
      }
      
      if (filters.categoryNumId !== undefined) {
        query.categoryNumId = filters.categoryNumId;
      }
      
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      
      const subcategories = await Subcategory.find(query)
        .sort({ name: 1 })
        .populate('categoryId', 'name slug');
      
      return subcategories.map(subcat => ({
        ...subcat.toObject()
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