import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import Settings from '@/models/Settings';
import dbConnect from './db';

// РўРёРїС‹ РґР»СЏ РєСЌС€РёСЂРѕРІР°РЅРёСЏ
export interface CacheOptions {
  tags?: string[];
  revalidate?: number; // РІСЂРµРјСЏ РІ СЃРµРєСѓРЅРґР°С…
}

// РЈС‚РёР»РёС‚Р° РґР»СЏ СЃРѕР·РґР°РЅРёСЏ РєР»СЋС‡РµР№ РєСЌС€Р°
function createCacheKey(prefix: string, params: Record<string, any> = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return sortedParams ? `${prefix}:${sortedParams}` : prefix;
}

// РљСЌС€ РґР»СЏ С‚РѕРІР°СЂРѕРІ
export async function getCachedProducts(filters: {
  categoryId?: string;
  subcategoryId?: string;
  inStock?: boolean;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const cacheKey = createCacheKey('products', filters);
  
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
        },
        cached: false // РџРѕРјРµС‡Р°РµРј РєР°Рє РЅРµ РёР· РєСЌС€Р°
      };
    },
    [cacheKey],
    {
      revalidate: 5 * 60, // 5 РјРёРЅСѓС‚
      tags: ['products']
    }
  )();
}

// РљСЌС€ РґР»СЏ РєР°С‚РµРіРѕСЂРёР№
export async function getCachedCategories() {
  return unstable_cache(
    async () => {
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: Category } = await import('@/models/Category');
      const { default: Subcategory } = await import('@/models/Subcategory');
      
      await dbConnect();
      
      // РџРѕР»СѓС‡Р°РµРј РІСЃРµ РєР°С‚РµРіРѕСЂРёРё Рё РїРѕРґРєР°С‚РµРіРѕСЂРёРё РїР°СЂР°Р»Р»РµР»СЊРЅРѕ
      const [categories, allSubcategories] = await Promise.all([
        Category.find().sort({ name: 1 }).lean(),
        Subcategory.find().lean(),
      ]);
      
      // РЎРѕР·РґР°РµРј РєР°СЂС‚Сѓ РїРѕРґРєР°С‚РµРіРѕСЂРёР№ РґР»СЏ Р±С‹СЃС‚СЂРѕРіРѕ РґРѕСЃС‚СѓРїР°
      const subcategoryMap = new Map(
        allSubcategories.map(sub => [String(sub._id), sub])
      );
      
      // Р’СЂСѓС‡РЅСѓСЋ РЅР°РїРѕР»РЅСЏРµРј РєР°С‚РµРіРѕСЂРёРё РїРѕРґРєР°С‚РµРіРѕСЂРёСЏРјРё
      const populatedCategories = categories.map(category => {
        const categorySubcategories = Array.isArray(category.subcategories)
          ? category.subcategories
              .map(subId => {
                const subIdStr = subId.toString();
                const sub = subcategoryMap.get(subIdStr);
                return sub;
              })
              .filter(Boolean) // РЈР±РёСЂР°РµРј null, РµСЃР»Рё РїРѕРґРєР°С‚РµРіРѕСЂРёСЏ РЅРµ РЅР°Р№РґРµРЅР°
          : [];

        return {
          ...category,
          subcategories: categorySubcategories,
          cached: false // РџРѕРјРµС‡Р°РµРј РєР°Рє РЅРµ РёР· РєСЌС€Р°
        };
      });
      
      return populatedCategories;
    },
    ['categories'],
    {
      revalidate: 10 * 60, // 10 РјРёРЅСѓС‚
      tags: ['categories']
    }
  )();
}

// РљСЌС€ РґР»СЏ РЅР°СЃС‚СЂРѕРµРє РїР»Р°С‚РµР¶РµР№
export async function getCachedPaymentSettings() {
  return unstable_cache(
    async () => {
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: PaymentSettings } = await import('@/models/PaymentSettings');
      
      await dbConnect();
      
      let settings = await PaymentSettings.findOne();
      
      if (!settings) {
        // РЎРѕР·РґР°РµРј РЅР°СЃС‚СЂРѕР№РєРё РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ
        settings = await PaymentSettings.create({
          stripe: { enabled: false, publishableKey: '', secretKey: '' },
          yookassa: { enabled: false, shopId: '', secretKey: '' },
          sberbank: { enabled: false, merchantId: '', apiKey: '' },
          cashOnDelivery: { enabled: true },
          cardOnDelivery: { enabled: true }
        });
      }
      
      return {
        ...settings.toObject(),
        cached: false // РџРѕРјРµС‡Р°РµРј РєР°Рє РЅРµ РёР· РєСЌС€Р°
      };
    },
    ['payment-settings'],
    {
      revalidate: 60 * 60, // 1 С‡Р°СЃ
      tags: ['payment-settings']
    }
  )();
}

// РљСЌС€ РґР»СЏ РЅР°СЃС‚СЂРѕРµРє
export async function getCachedSettings() {
  return unstable_cache(
    async () => {
      await dbConnect();
      // РСЃРїРѕР»СЊР·СѓРµРј findOne, С‚Р°Рє РєР°Рє РЅР°СЃС‚СЂРѕР№РєРё - СЌС‚Рѕ РѕРґРёРЅ РґРѕРєСѓРјРµРЅС‚
      const settings = await Settings.findOne({ settingKey: 'global-settings' }) || await Settings.findOne();
      return settings ? settings.toObject() : null;
    },
    ['settings'], // РљР»СЋС‡ РєСЌС€Р°
    {
      revalidate: 60 * 60, // 1 С‡Р°СЃ
      tags: ['settings'], // РўРµРі РґР»СЏ СЂРµРІР°Р»РёРґР°С†РёРё
    }
  )();
}

// РљСЌС€ РґР»СЏ СЃС‚Р°С‚РёСЃС‚РёРєРё Р·Р°РєР°Р·РѕРІ
export async function getCachedOrderStats() {
  return unstable_cache(
    async () => {
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: Order } = await import('@/models/Order');
      
      await dbConnect();
      
      const totalOrders = await Order.countDocuments();
      const pendingOrders = await Order.countDocuments({ status: 'pending' });
      const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
      const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
      
      // РћР±С‰Р°СЏ СЃСѓРјРјР° РІСЃРµС… Р·Р°РєР°Р·РѕРІ
      const totalRevenue = await Order.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      
      // Р—Р°РєР°Р·С‹ Р·Р° РїРѕСЃР»РµРґРЅРёРµ 7 РґРЅРµР№
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
        recentOrders,
        cached: false // РџРѕРјРµС‡Р°РµРј РєР°Рє РЅРµ РёР· РєСЌС€Р°
      };
    },
    ['order-stats'],
    {
      revalidate: 5 * 60, // 5 РјРёРЅСѓС‚
      tags: ['order-stats']
    }
  )();
}

// РљСЌС€ РґР»СЏ Р·Р°РєР°Р·РѕРІ СЃ РїР°РіРёРЅР°С†РёРµР№
export async function getCachedOrders(filters: {
  email?: string;
  status?: string;
  deliveryType?: string; // РќРѕРІС‹Р№ С„РёР»СЊС‚СЂ РїРѕ С‚РёРїСѓ РґРѕСЃС‚Р°РІРєРё
  page?: number;
  limit?: number;
} = {}) {
  const cacheKey = createCacheKey('orders', filters);
  
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
      
      // Р”РѕР±Р°РІР»СЏРµРј С„РёР»СЊС‚СЂ РїРѕ С‚РёРїСѓ РґРѕСЃС‚Р°РІРєРё
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
        },
        cached: false // РџРѕРјРµС‡Р°РµРј РєР°Рє РЅРµ РёР· РєСЌС€Р°
      };
    },
    [cacheKey],
    {
      revalidate: 60, // 1 РјРёРЅСѓС‚Р°
      tags: ['orders']
    }
  )();
}

// РљСЌС€ РґР»СЏ РїРѕРґРєР°С‚РµРіРѕСЂРёР№
export async function getCachedSubcategories(filters: {
  categoryId?: string;
  categoryNumId?: number;
  isActive?: boolean;
} = {}) {
  const cacheKey = createCacheKey('subcategories', filters);
  
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
        ...subcat.toObject(),
        cached: false // РџРѕРјРµС‡Р°РµРј РєР°Рє РЅРµ РёР· РєСЌС€Р°
      }));
    },
    [cacheKey],
    {
      revalidate: 10 * 60, // 10 РјРёРЅСѓС‚
      tags: ['subcategories']
    }
  )();
}

// Р¤СѓРЅРєС†РёРё РґР»СЏ РёРЅРІР°Р»РёРґР°С†РёРё РєСЌС€Р°
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

// РџРѕР»РЅР°СЏ РёРЅРІР°Р»РёРґР°С†РёСЏ РІСЃРµРіРѕ РєСЌС€Р°
export function invalidateAllCache() {
  invalidateSettingsCache();
  invalidateProductsCache();
  invalidateCategoriesCache();
  invalidatePaymentSettingsCache();
  invalidateOrderStatsCache();
  invalidateOrdersCache();
  invalidateSubcategoriesCache();
}

// РљСЌС€ СЃ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёРјРё РїР°СЂР°РјРµС‚СЂР°РјРё
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
