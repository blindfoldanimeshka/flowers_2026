export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { getCachedSettings, invalidateSettingsCache } from '@/lib/cache';
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
  homeCategoryCardBackgrounds?: Record<string, string>;
  homeBannerBackground?: string;
  homeBannerSlides?: string[];
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
  'socialLinks',
  'homeCategoryCardBackgrounds',
  'homeBannerBackground',
  'homeBannerSlides',
];

function sanitizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function validateAndSanitizeSettings(body: Record<string, unknown>): SettingsUpdatePayload {
  const sanitizedBody: SettingsUpdatePayload = {};

  for (const field of ALLOWED_FIELDS) {
    if (body[field] === undefined) continue;

    const value = body[field];

    if (
      field === 'siteName' ||
      field === 'siteDescription' ||
      field === 'contactPhone' ||
      field === 'address' ||
      field === 'workingHours' ||
      field === 'currency' ||
      field === 'timezone' ||
      field === 'seoTitle' ||
      field === 'seoDescription' ||
      field === 'seoKeywords' ||
      field === 'homeBannerBackground'
    ) {
      const normalized = sanitizeString(value);
      if (normalized !== undefined) {
        sanitizedBody[field] = normalized;
      }
      continue;
    }

    if (
      field === 'deliveryRadius' ||
      field === 'minOrderAmount' ||
      field === 'freeDeliveryThreshold' ||
      field === 'deliveryFee'
    ) {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        sanitizedBody[field] = value;
      }
      continue;
    }

    if (field === 'maintenanceMode') {
      if (typeof value === 'boolean') {
        sanitizedBody[field] = value;
      }
      continue;
    }

    if (field === 'socialLinks' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const socialLinks: SettingsUpdatePayload['socialLinks'] = {};
      const socialValue = value as Record<string, unknown>;
      const socialFields: (keyof NonNullable<SettingsUpdatePayload['socialLinks']>)[] = [
        'instagram',
        'vk',
        'telegram',
        'whatsapp',
      ];

      for (const socialField of socialFields) {
        const normalized = sanitizeString(socialValue[socialField]);
        if (normalized !== undefined) {
          socialLinks[socialField] = normalized;
        }
      }

      if (Object.keys(socialLinks).length > 0) {
        sanitizedBody.socialLinks = socialLinks;
      }
      continue;
    }

    if (field === 'homeCategoryCardBackgrounds' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const cleanedEntries = Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key.trim(), sanitizeString(item)] as const)
        .filter(([key, item]) => key.length > 0 && typeof item === 'string');
      sanitizedBody.homeCategoryCardBackgrounds = Object.fromEntries(cleanedEntries);
      continue;
    }

    if (field === 'homeBannerSlides') {
      const slides = Array.isArray(value)
        ? value
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 6)
        : [];

      sanitizedBody.homeBannerSlides = slides;
    }
  }

  return sanitizedBody;
}

function normalizePublicSettings(settings: Record<string, unknown> | null) {
  if (!settings) {
    return {
      settingKey: SETTINGS_KEY,
      siteName: 'Floramix',
      siteDescription: '',
      contactPhone: '',
      address: '',
      workingHours: '',
      socialLinks: {},
      homeCategoryCardBackgrounds: {},
      homeBannerBackground: '',
      homeBannerSlides: [],
    };
  }

  return {
    ...settings,
    homeCategoryCardBackgrounds:
      typeof settings.homeCategoryCardBackgrounds === 'object' &&
      settings.homeCategoryCardBackgrounds !== null &&
      !Array.isArray(settings.homeCategoryCardBackgrounds)
        ? settings.homeCategoryCardBackgrounds
        : {},
    homeBannerBackground: typeof settings.homeBannerBackground === 'string' ? settings.homeBannerBackground : '',
    homeBannerSlides: Array.isArray(settings.homeBannerSlides)
      ? settings.homeBannerSlides.filter((item): item is string => typeof item === 'string').slice(0, 6)
      : [],
  };
}

async function updateOrCreateSettings(body: Record<string, unknown>): Promise<any> {
  await dbConnect();

  const sanitizedBody = validateAndSanitizeSettings(body);

  const defaultSettings = {
    settingKey: SETTINGS_KEY,
    siteName: 'Цветочный магазин',
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
    maintenanceMode: false,
    homeCategoryCardBackgrounds: {},
    homeBannerBackground: '',
    homeBannerSlides: [],
  };

  const settings = await Settings.findOneAndUpdate(
    { settingKey: SETTINGS_KEY },
    {
      $set: { ...sanitizedBody, settingKey: SETTINGS_KEY },
      $setOnInsert: defaultSettings,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  await Settings.deleteMany({ _id: { $ne: settings._id } });
  invalidateSettingsCache();

  return settings;
}

export async function GET() {
  try {
    const settings = await getCachedSettings();
    const plainSettings = settings ? JSON.parse(JSON.stringify(settings)) : null;

    return NextResponse.json({ settings: normalizePublicSettings(plainSettings) }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to get settings:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении настроек', details: process.env.NODE_ENV === 'development' ? error?.message : undefined },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const settings = await updateOrCreateSettings(body);

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при обновлении настроек:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: 'Ошибка валидации', details: validationErrors }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Ошибка при обновлении настроек', details: process.env.NODE_ENV === 'development' ? error?.message : undefined },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return PUT(request);
}
