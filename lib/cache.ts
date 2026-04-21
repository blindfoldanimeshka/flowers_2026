import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import Settings from '@/models/Settings';
import dbConnect from './db';

// Р СћР С‘Р С—РЎвЂ№ Р Т‘Р В»РЎРЏ Р С”РЎРЊРЎв‚¬Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ
export interface CacheOptions {
  tags?: string[];
  revalidate?: number; // Р Р†РЎР‚Р ВµР СРЎРЏ Р Р† РЎРѓР ВµР С”РЎС“Р Р…Р Т‘Р В°РЎвЂ¦
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

// Р Р€РЎвЂљР С‘Р В»Р С‘РЎвЂљР В° Р Т‘Р В»РЎРЏ РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С”Р В»РЎР‹РЎвЂЎР ВµР в„– Р С”РЎРЊРЎв‚¬Р В°
function createCacheKey(prefix: string, params: Record<string, any> = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return sortedParams ? `${prefix}:${sortedParams}` : prefix;
}

// Р С™РЎРЊРЎв‚¬ Р Т‘Р В»РЎРЏ РЎвЂљР С•Р Р†Р В°РЎР‚Р С•Р Р†
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
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
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
      revalidate: 3 * 60, // 5 Р СР С‘Р Р…РЎС“РЎвЂљ
      tags: ['products']
    }
  )();
}

// Р С™РЎРЊРЎв‚¬ Р Т‘Р В»РЎРЏ Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘Р в„–
export async function getCachedCategories() {
  recordCacheAccess('categories', 5 * 60);

  return unstable_cache(
    async () => {
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: Category } = await import('@/models/Category');
      const { default: Subcategory } = await import('@/models/Subcategory');
      
      await dbConnect();
      
      // Р СџР С•Р В»РЎС“РЎвЂЎР В°Р ВµР С Р Р†РЎРѓР Вµ Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘Р С‘ Р С‘ Р С—Р С•Р Т‘Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘Р С‘ Р С—Р В°РЎР‚Р В°Р В»Р В»Р ВµР В»РЎРЉР Р…Р С•
      const [categories, allSubcategories] = await Promise.all([
        Category.find().sort({ name: 1 }).lean(),
        Subcategory.find().lean(),
      ]);
      
      // Р РЋР С•Р В·Р Т‘Р В°Р ВµР С Р С”Р В°РЎР‚РЎвЂљРЎС“ Р С—Р С•Р Т‘Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘Р в„– Р Т‘Р В»РЎРЏ Р В±РЎвЂ№РЎРѓРЎвЂљРЎР‚Р С•Р С–Р С• Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р В°
      const subcategoryMap = new Map(
        allSubcategories.map(sub => [String(sub._id), sub])
      );
      
      // Р вЂ™РЎР‚РЎС“РЎвЂЎР Р…РЎС“РЎР‹ Р Р…Р В°Р С—Р С•Р В»Р Р…РЎРЏР ВµР С Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘Р С‘ Р С—Р С•Р Т‘Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘РЎРЏР СР С‘
      const populatedCategories = categories.map(category => {
        const categorySubcategories = Array.isArray(category.subcategories)
          ? category.subcategories
              .map(subId => {
                const subIdStr = subId.toString();
                const sub = subcategoryMap.get(subIdStr);
                return sub;
              })
              .filter(Boolean) // Р Р€Р В±Р С‘РЎР‚Р В°Р ВµР С null, Р ВµРЎРѓР В»Р С‘ Р С—Р С•Р Т‘Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°
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
      revalidate: 5 * 60, // 10 Р СР С‘Р Р…РЎС“РЎвЂљ
      tags: ['categories']
    }
  )();
}

// Р С™РЎРЊРЎв‚¬ Р Т‘Р В»РЎРЏ Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р ВµР С” Р С—Р В»Р В°РЎвЂљР ВµР В¶Р ВµР в„–
export async function getCachedPaymentSettings() {
  recordCacheAccess('payment-settings', 60 * 60);

  return unstable_cache(
    async () => {
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: PaymentSettings } = await import('@/models/PaymentSettings');
      
      await dbConnect();
      
      let settings = await PaymentSettings.findOne();
      
      if (!settings) {
        // Р РЋР С•Р В·Р Т‘Р В°Р ВµР С Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р в„–Р С”Р С‘ Р С—Р С• РЎС“Р СР С•Р В»РЎвЂЎР В°Р Р…Р С‘РЎР‹
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
      revalidate: 60 * 60, // 1 РЎвЂЎР В°РЎРѓ
      tags: ['payment-settings']
    }
  )();
}

// Р С™РЎРЊРЎв‚¬ Р Т‘Р В»РЎРЏ Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р ВµР С”
export async function getCachedSettings() {
  recordCacheAccess('settings', 60 * 60);

  return unstable_cache(
    async () => {
      await dbConnect();
      // Р ВРЎРѓР С—Р С•Р В»РЎРЉР В·РЎС“Р ВµР С findOne, РЎвЂљР В°Р С” Р С”Р В°Р С” Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р в„–Р С”Р С‘ - РЎРЊРЎвЂљР С• Р С•Р Т‘Р С‘Р Р… Р Т‘Р С•Р С”РЎС“Р СР ВµР Р…РЎвЂљ
      const settings = await Settings.findOne({ settingKey: 'global-settings' }) || await Settings.findOne();
      return settings ? settings.toObject() : null;
    },
    ['settings'], // Р С™Р В»РЎР‹РЎвЂЎ Р С”РЎРЊРЎв‚¬Р В°
    {
      revalidate: 60 * 60, // 1 РЎвЂЎР В°РЎРѓ
      tags: ['settings'], // Р СћР ВµР С– Р Т‘Р В»РЎРЏ РЎР‚Р ВµР Р†Р В°Р В»Р С‘Р Т‘Р В°РЎвЂ Р С‘Р С‘
    }
  )();
}

// Р С™РЎРЊРЎв‚¬ Р Т‘Р В»РЎРЏ РЎРѓРЎвЂљР В°РЎвЂљР С‘РЎРѓРЎвЂљР С‘Р С”Р С‘ Р В·Р В°Р С”Р В°Р В·Р С•Р Р†
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
      
      // Р С›Р В±РЎвЂ°Р В°РЎРЏ РЎРѓРЎС“Р СР СР В° Р Р†РЎРѓР ВµРЎвЂ¦ Р В·Р В°Р С”Р В°Р В·Р С•Р Р†
      const totalRevenue = await Order.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      
      // Р вЂ”Р В°Р С”Р В°Р В·РЎвЂ№ Р В·Р В° Р С—Р С•РЎРѓР В»Р ВµР Т‘Р Р…Р С‘Р Вµ 7 Р Т‘Р Р…Р ВµР в„–
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
      revalidate: 3 * 60, // 5 Р СР С‘Р Р…РЎС“РЎвЂљ
      tags: ['order-stats']
    }
  )();
}

// Р С™РЎРЊРЎв‚¬ Р Т‘Р В»РЎРЏ Р В·Р В°Р С”Р В°Р В·Р С•Р Р† РЎРѓ Р С—Р В°Р С–Р С‘Р Р…Р В°РЎвЂ Р С‘Р ВµР в„–
export async function getCachedOrders(filters: {
  email?: string;
  status?: string;
  deliveryType?: string; // Р СњР С•Р Р†РЎвЂ№Р в„– РЎвЂћР С‘Р В»РЎРЉРЎвЂљРЎР‚ Р С—Р С• РЎвЂљР С‘Р С—РЎС“ Р Т‘Р С•РЎРѓРЎвЂљР В°Р Р†Р С”Р С‘
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
      
      // Р вЂќР С•Р В±Р В°Р Р†Р В»РЎРЏР ВµР С РЎвЂћР С‘Р В»РЎРЉРЎвЂљРЎР‚ Р С—Р С• РЎвЂљР С‘Р С—РЎС“ Р Т‘Р С•РЎРѓРЎвЂљР В°Р Р†Р С”Р С‘
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
      revalidate: 30, // 1 Р СР С‘Р Р…РЎС“РЎвЂљР В°
      tags: ['orders']
    }
  )();
}

// Р С™РЎРЊРЎв‚¬ Р Т‘Р В»РЎРЏ Р С—Р С•Р Т‘Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘Р в„–
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
      revalidate: 5 * 60, // 10 Р СР С‘Р Р…РЎС“РЎвЂљ
      tags: ['subcategories']
    }
  )();
}

// Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘Р С‘ Р Т‘Р В»РЎРЏ Р С‘Р Р…Р Р†Р В°Р В»Р С‘Р Т‘Р В°РЎвЂ Р С‘Р С‘ Р С”РЎРЊРЎв‚¬Р В°
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

// Р СџР С•Р В»Р Р…Р В°РЎРЏ Р С‘Р Р…Р Р†Р В°Р В»Р С‘Р Т‘Р В°РЎвЂ Р С‘РЎРЏ Р Р†РЎРѓР ВµР С–Р С• Р С”РЎРЊРЎв‚¬Р В°
export function invalidateAllCache() {
  invalidateSettingsCache();
  invalidateProductsCache();
  invalidateCategoriesCache();
  invalidatePaymentSettingsCache();
  invalidateOrderStatsCache();
  invalidateOrdersCache();
  invalidateSubcategoriesCache();
}

// Р С™РЎРЊРЎв‚¬ РЎРѓ Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЉРЎРѓР С”Р С‘Р СР С‘ Р С—Р В°РЎР‚Р В°Р СР ВµРЎвЂљРЎР‚Р В°Р СР С‘
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

