import { z } from 'zod';

// Схемы для продуктов
export const ProductSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100, 'Название слишком длинное'),
  description: z.string().optional(),
  price: z.number().min(0, 'Цена не может быть отрицательной'),
  oldPrice: z.number().min(0).optional(),
  image: z.string().url('Неверный URL изображения').optional(),
  category: z.string().min(1, 'Категория обязательна'),
  subcategory: z.string().min(1, 'Подкатегория обязательна'),
  inStock: z.boolean().default(true),
  featured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export const ProductUpdateSchema = ProductSchema.partial();

// Схемы для категорий
export const CategorySchema = z.object({
  name: z.string().min(1, 'Название категории обязательно').max(50),
  description: z.string().optional(),
  image: z.string().url().optional(),
  slug: z.string().min(1).max(50),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const CategoryUpdateSchema = CategorySchema.partial();

// Схемы для подкатегорий
export const SubcategorySchema = z.object({
  name: z.string().min(1, 'Название подкатегории обязательно').max(50),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'ID категории обязателен'),
  slug: z.string().min(1).max(50),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const SubcategoryUpdateSchema = SubcategorySchema.partial();

// Схемы для заказов
export const OrderItemSchema = z.object({
  productId: z.string().min(1, 'ID продукта обязателен'),
  name: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1, 'Количество должно быть больше 0'),
});

export const CustomerSchema = z.object({
  name: z.string().min(1, 'Имя обязательно').max(100),
  email: z.string().email('Неверный формат email'),
  phone: z.string().min(10, 'Неверный формат телефона').max(20),
  address: z.string().min(1, 'Адрес обязателен').max(500),
});

export const OrderSchema = z.object({
  customer: CustomerSchema,
  items: z.array(OrderItemSchema).min(1, 'Заказ должен содержать товары'),
  totalAmount: z.number().min(0),
  deliveryType: z.enum(['pickup', 'delivery']),
  paymentMethod: z.enum(['cash', 'card', 'online']),
  status: z.enum(['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled']).default('pending'),
  notes: z.string().max(500).optional(),
});

export const OrderUpdateSchema = OrderSchema.partial();

// Схемы для настроек
export const SettingsSchema = z.object({
  siteName: z.string().min(1, 'Название сайта обязательно').max(100),
  siteDescription: z.string().max(200).optional(),
  contactPhone: z.string().min(10).max(20).optional(),
  contactEmail: z.string().email().optional(),
  contactAddress: z.string().max(500).optional(),
  socialLinks: z.object({
    instagram: z.string().url().optional(),
    telegram: z.string().url().optional(),
    whatsapp: z.string().url().optional(),
    vk: z.string().url().optional(),
  }).optional(),
  deliverySettings: z.object({
    freeDeliveryThreshold: z.number().min(0).default(0),
    deliveryCost: z.number().min(0).default(0),
    deliveryTime: z.string().optional(),
  }).optional(),
  paymentSettings: z.object({
    cashEnabled: z.boolean().default(true),
    cardEnabled: z.boolean().default(true),
    onlineEnabled: z.boolean().default(false),
  }).optional(),
});

export const SettingsUpdateSchema = SettingsSchema.partial();

// Схемы для аутентификации
export const LoginSchema = z.object({
  username: z.string().min(1, 'Имя пользователя обязательно'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export const UserSchema = z.object({
  username: z.string().min(3, 'Имя пользователя должно содержать минимум 3 символа').max(50),
  email: z.string().email('Неверный формат email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  role: z.enum(['admin', 'user']).default('user'),
});

// Схемы для API запросов
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

export const SearchSchema = z.object({
  query: z.string().min(1).max(100),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  featured: z.boolean().optional(),
});

// Схемы для фильтрации
export const FilterSchema = z.object({
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  inStock: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortBy: z.enum(['name', 'price', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Утилиты для валидации
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Ошибка валидации: ${errorMessages.join(', ')}`);
    }
    throw error;
  }
}

export function validatePartialData<T>(schema: z.ZodType<T>, data: unknown): Partial<T> {
  try {
    // Используем метод partial() который доступен на ZodObject
    if ('partial' in schema && typeof schema.partial === 'function') {
      return schema.partial().parse(data);
    }
    // Если partial не доступен, просто парсим данные как есть
    return schema.parse(data) as Partial<T>;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Ошибка валидации: ${errorMessages.join(', ')}`);
    }
    throw error;
  }
}

// Типы для экспорта
export type Product = z.infer<typeof ProductSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;
export type Subcategory = z.infer<typeof SubcategorySchema>;
export type SubcategoryUpdate = z.infer<typeof SubcategoryUpdateSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderUpdate = z.infer<typeof OrderUpdateSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;
export type LoginData = z.infer<typeof LoginSchema>;
export type User = z.infer<typeof UserSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type SearchParams = z.infer<typeof SearchSchema>;
export type FilterParams = z.infer<typeof FilterSchema>;

