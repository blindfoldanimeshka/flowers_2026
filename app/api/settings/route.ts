export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { getCachedSettings, invalidateSettingsCache } from '@/lib/cache';
import { requireAdmin } from '@/lib/auth';

// Интерфейс для валидации входящих данных настроек
interface SettingsUpdatePayload {
  siteName?: string;
  siteDescription?: string;
  contactPhone?: string;
  address?: string;
  workingHours?: string;
  deliveryRadius?: number;
  minOrderAmount?: number;
  freeDeliveryThreshold?: number;
  deliveryFee?: number;
  currency?: string;
  timezone?: string;
  maintenanceMode?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  socialLinks?: {
    instagram?: string;
    vk?: string;
    telegram?: string;
    whatsapp?: string;
  };
}

// Whitelist разрешенных полей для обновления
const ALLOWED_FIELDS: (keyof SettingsUpdatePayload)[] = [
  'siteName',
  'siteDescription', 
  'contactPhone',
  'address',
  'workingHours',
  'deliveryRadius',
  'minOrderAmount',
  'freeDeliveryThreshold',
  'deliveryFee',
  'currency',
  'timezone',
  'maintenanceMode',
  'seoTitle',
  'seoDescription',
  'seoKeywords',
  'socialLinks'
];

// Функция для валидации и санитизации входящих данных
function validateAndSanitizeSettings(body: any): SettingsUpdatePayload {
  const sanitizedBody: SettingsUpdatePayload = {};
  
  // Проверяем только разрешенные поля
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      const value = body[field];
      
      // Валидация строковых полей
      if (typeof value === 'string' && (field === 'siteName' || field === 'siteDescription' || 
          field === 'contactPhone' || field === 'address' || field === 'workingHours' ||
          field === 'currency' || field === 'timezone' || field === 'seoTitle' || 
          field === 'seoDescription' || field === 'seoKeywords')) {
        // Обрезаем пробелы и проверяем длину
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          sanitizedBody[field] = trimmed;
        }
      }
      // Валидация числовых полей
      else if (field === 'deliveryRadius' || field === 'minOrderAmount' || 
               field === 'freeDeliveryThreshold' || field === 'deliveryFee') {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          sanitizedBody[field] = value;
        }
      }
      // Валидация булевых полей
      else if (field === 'maintenanceMode') {
        if (typeof value === 'boolean') {
          sanitizedBody[field] = value;
        }
      }
      // Валидация объекта socialLinks
      else if (field === 'socialLinks' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const socialLinks: any = {};
        const socialFields = ['instagram', 'vk', 'telegram', 'whatsapp'];
        
        for (const socialField of socialFields) {
          if (value[socialField] !== undefined && typeof value[socialField] === 'string') {
            const trimmed = value[socialField].trim();
            if (trimmed.length > 0) {
              socialLinks[socialField] = trimmed;
            }
          }
        }
        
        if (Object.keys(socialLinks).length > 0) {
          sanitizedBody[field] = socialLinks;
        }
      }
    }
  }
  
  return sanitizedBody;
}

// Helper функция для обновления или создания настроек
async function updateOrCreateSettings(body: any): Promise<any> {
  await dbConnect();
  
  // Валидируем и санитизируем входящие данные
  const sanitizedBody = validateAndSanitizeSettings(body);
  
  // Значения по умолчанию для новых документов
  const defaultSettings = {
    siteName: 'Цветочный Магазин',
    contactPhone: '+7-000-000-00-00',
    address: 'Город, Улица, Дом',
    workingHours: '10:00-20:00',
    siteDescription: 'Лучшие цветы по лучшим ценам',
    deliveryRadius: 10,
    minOrderAmount: 0,
    freeDeliveryThreshold: 0,
    deliveryFee: 0,
    currency: 'RUB',
    timezone: 'Europe/Moscow',
    maintenanceMode: false
  };
  
  // Атомарный upsert - создает документ если его нет, обновляет если есть
  const settings = await Settings.findOneAndUpdate(
    { _id: 'global-settings' }, // Используем фиксированный ID для единственного документа настроек
    {
      $set: sanitizedBody, // Обновляем только переданные поля
      $setOnInsert: defaultSettings // Устанавливаем значения по умолчанию только при создании
    },
    {
      new: true, // Возвращаем обновленный документ
      upsert: true, // Создаем если не найден
      runValidators: true, // Запускаем валидаторы схемы
      setDefaultsOnInsert: true // Устанавливаем значения по умолчанию при создании
    }
  );
  
  // Инвалидируем кэш после успешного обновления
  try {
    await invalidateSettingsCache();
  } catch (cacheError: any) {
    console.error('Ошибка при инвалидации кэша настроек:', cacheError);
    // Не прерываем выполнение, только логируем ошибку
  }
  
  return settings;
}

// PUT запрос для обновления настроек (только для админов)
export async function PUT(request: NextRequest) {
  try {
    // Проверка аутентификации и прав администратора
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      console.log('Неавторизованная попытка обновления настроек');
      return NextResponse.json(
        { error: 'Требуется авторизация администратора' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const settings = await updateOrCreateSettings(body);
    
    return NextResponse.json({ settings: settings }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при обновлении настроек:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationErrors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Ошибка при обновлении настроек', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Проверка аутентификации и прав администратора
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      console.log('Неавторизованная попытка обновления настроек');
      return NextResponse.json(
        { error: 'Требуется авторизация администратора' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const settings = await updateOrCreateSettings(body);
    
    return NextResponse.json({ settings: settings }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при обновлении настроек:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationErrors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Ошибка при обновлении настроек', details: error.message },
      { status: 500 }
    );
  }
} 