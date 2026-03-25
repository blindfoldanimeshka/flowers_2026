import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import Settings from '@/models/Settings';
import dbConnect from './db';

// Типы для кэширования
export interface CacheOptions {
  tags?: string[];
  revalidate?: number; // время в секундах
}

// Утилита для создания ключей кэша
function createCacheKey(prefix: string, params: Record<string, any> = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return sortedParams ? `${prefix}:${sortedParams}` : prefix;
}

// Кэш для товаров
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
      console.log(`[CACHE MISS] Загружаем товары из БД с фильтрами:`, filters);
      
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
        cached: false // Помечаем как не из кэша
      };
    },
    [cacheKey],
    {
      revalidate: 5 * 60, // 5 минут
      tags: ['products']
    }
  )();
}

// Кэш для категорий
export async function getCachedCategories() {
  return unstable_cache(
    async () => {
      console.log('[CACHE MISS] Загружаем категории из БД');
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: Category } = await import('@/models/Category');
      const { default: Subcategory } = await import('@/models/Subcategory');
      
      await dbConnect();
      
      // Получаем все категории и подкатегории параллельно
      const [categories, allSubcategories] = await Promise.all([
        Category.find().sort({ name: 1 }).lean(),
        Subcategory.find().lean(),
      ]);
      
      console.log('[CACHE] Найдено категорий:', categories.length);
      console.log('[CACHE] Найдено подкатегорий:', allSubcategories.length);
      
      // Логируем все категории
      categories.forEach(cat => {
        console.log(`[CACHE] Категория: ${cat.name}, ID: ${cat._id}, subcategories:`, 
          Array.isArray(cat.subcategories) ? cat.subcategories.map(id => id.toString()) : []);
      });
      
      // Логируем все подкатегории
      allSubcategories.forEach(sub => {
        console.log(`[CACHE] Подкатегория: ${sub.name}, ID: ${sub._id}, categoryId: ${sub.categoryId}`);
      });
      
      // Создаем карту подкатегорий для быстрого доступа
      const subcategoryMap = new Map(
        allSubcategories.map(sub => [String(sub._id), sub])
      );
      
      // Вручную наполняем категории подкатегориями
      const populatedCategories = categories.map(category => {
        const categorySubcategories = Array.isArray(category.subcategories)
          ? category.subcategories
              .map(subId => {
                const subIdStr = subId.toString();
                const sub = subcategoryMap.get(subIdStr);
                if (!sub) {
                  console.log(`[CACHE] Подкатегория с ID ${subIdStr} не найдена для категории ${category.name}`);
                }
                return sub;
              })
              .filter(Boolean) // Убираем null, если подкатегория не найдена
          : [];
          
        console.log(`[CACHE] Категория ${category.name} после наполнения имеет ${categorySubcategories.length} подкатегорий`);
        
        return {
          ...category,
          subcategories: categorySubcategories,
          cached: false // Помечаем как не из кэша
        };
      });
      
      return populatedCategories;
    },
    ['categories'],
    {
      revalidate: 10 * 60, // 10 минут
      tags: ['categories']
    }
  )();
}

// Кэш для настроек платежей
export async function getCachedPaymentSettings() {
  return unstable_cache(
    async () => {
      console.log('[CACHE MISS] Загружаем настройки платежей из БД');
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: PaymentSettings } = await import('@/models/PaymentSettings');
      
      await dbConnect();
      
      let settings = await PaymentSettings.findOne();
      
      if (!settings) {
        // Создаем настройки по умолчанию
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
        cached: false // Помечаем как не из кэша
      };
    },
    ['payment-settings'],
    {
      revalidate: 60 * 60, // 1 час
      tags: ['payment-settings']
    }
  )();
}

// Кэш для настроек
export async function getCachedSettings() {
  return unstable_cache(
    async () => {
      console.log('[CACHE MISS] Загружаем настройки из БД');
      await dbConnect();
      // Используем findOne, так как настройки - это один документ
      const settings = await Settings.findOne({ settingKey: 'global-settings' }) || await Settings.findOne();
      return settings ? settings.toObject() : null;
    },
    ['settings'], // Ключ кэша
    {
      revalidate: 60 * 60, // 1 час
      tags: ['settings'], // Тег для ревалидации
    }
  )();
}

// Кэш для статистики заказов
export async function getCachedOrderStats() {
  return unstable_cache(
    async () => {
      console.log('[CACHE MISS] Загружаем статистику заказов из БД');
      
      const { default: dbConnect } = await import('@/lib/db');
      const { default: Order } = await import('@/models/Order');
      
      await dbConnect();
      
      const totalOrders = await Order.countDocuments();
      const pendingOrders = await Order.countDocuments({ status: 'pending' });
      const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
      const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
      
      // Общая сумма всех заказов
      const totalRevenue = await Order.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      
      // Заказы за последние 7 дней
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
        cached: false // Помечаем как не из кэша
      };
    },
    ['order-stats'],
    {
      revalidate: 5 * 60, // 5 минут
      tags: ['order-stats']
    }
  )();
}

// Кэш для заказов с пагинацией
export async function getCachedOrders(filters: {
  email?: string;
  status?: string;
  deliveryType?: string; // Новый фильтр по типу доставки
  page?: number;
  limit?: number;
} = {}) {
  const cacheKey = createCacheKey('orders', filters);
  
  return unstable_cache(
    async () => {
      console.log(`[CACHE MISS] Загружаем заказы из БД с фильтрами:`, filters);
      
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
      
      // Добавляем фильтр по типу доставки
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
        cached: false // Помечаем как не из кэша
      };
    },
    [cacheKey],
    {
      revalidate: 60, // 1 минута
      tags: ['orders']
    }
  )();
}

// Кэш для подкатегорий
export async function getCachedSubcategories(filters: {
  categoryId?: string;
  categoryNumId?: number;
  isActive?: boolean;
} = {}) {
  const cacheKey = createCacheKey('subcategories', filters);
  
  return unstable_cache(
    async () => {
      console.log(`[CACHE MISS] Загружаем подкатегории из БД с фильтрами:`, filters);
      
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
        cached: false // Помечаем как не из кэша
      }));
    },
    [cacheKey],
    {
      revalidate: 10 * 60, // 10 минут
      tags: ['subcategories']
    }
  )();
}

// Функции для инвалидации кэша
export function invalidateSettingsCache() {
  revalidateTag('settings');
  console.log('[CACHE] Инвалидирован кэш настроек');
}

export function invalidateProductsCache() {
  revalidateTag('products');
  console.log('[CACHE] Инвалидирован кэш товаров');
}

export function invalidateCategoriesCache() {
  revalidateTag('categories');
  console.log('[CACHE] Инвалидирован кэш категорий');
}

export function invalidatePaymentSettingsCache() {
  revalidateTag('payment-settings');
  console.log('[CACHE] Инвалидирован кэш настроек платежей');
}

export function invalidateOrderStatsCache() {
  revalidateTag('order-stats');
  console.log('[CACHE] Инвалидирован кэш статистики заказов');
}

export function invalidateOrdersCache() {
  revalidateTag('orders');
  console.log('[CACHE] Инвалидирован кэш заказов');
}

export function invalidateSubcategoriesCache() {
  revalidateTag('subcategories');
  console.log('[CACHE] Инвалидирован кэш подкатегорий');
}

// Полная инвалидация всего кэша
export function invalidateAllCache() {
  console.log('[CACHE] Инвалидация ВСЕХ кэшей...');
  invalidateSettingsCache();
  invalidateProductsCache();
  invalidateCategoriesCache();
  invalidatePaymentSettingsCache();
  invalidateOrderStatsCache();
  invalidateOrdersCache();
  invalidateSubcategoriesCache();
}

// Кэш с пользовательскими параметрами
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
