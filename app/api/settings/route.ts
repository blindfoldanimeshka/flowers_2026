export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { invalidateSettingsCache } from '@/lib/cache';
import { requireAdmin } from '@/lib/auth';

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

const SETTINGS_KEY = 'global-settings';

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

function validateAndSanitizeSettings(body: any): SettingsUpdatePayload {
  const sanitizedBody: SettingsUpdatePayload = {};

  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      const value = body[field];

      if (typeof value === 'string' && (field === 'siteName' || field === 'siteDescription' ||
          field === 'contactPhone' || field === 'address' || field === 'workingHours' ||
          field === 'currency' || field === 'timezone' || field === 'seoTitle' ||
          field === 'seoDescription' || field === 'seoKeywords')) {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          sanitizedBody[field] = trimmed;
        }
      }
      else if (field === 'deliveryRadius' || field === 'minOrderAmount' ||
               field === 'freeDeliveryThreshold' || field === 'deliveryFee') {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          sanitizedBody[field] = value;
        }
      }
      else if (field === 'maintenanceMode') {
        if (typeof value === 'boolean') {
          sanitizedBody[field] = value;
        }
      }
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

async function updateOrCreateSettings(body: any): Promise<any> {
  await dbConnect();

  const sanitizedBody = validateAndSanitizeSettings(body);

  const defaultSettings = {
    settingKey: SETTINGS_KEY,
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

  const settings = await Settings.findOneAndUpdate(
    { settingKey: SETTINGS_KEY },
    {
      $set: { ...sanitizedBody, settingKey: SETTINGS_KEY },
      $setOnInsert: defaultSettings
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );

  await Settings.deleteMany({ _id: { $ne: settings._id } });

  try {
    await invalidateSettingsCache();
  } catch (cacheError: any) {
    console.error('Ошибка при инвалидации кэша настроек:', cacheError);
  }

  return settings;
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
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
  return PUT(request);
}
