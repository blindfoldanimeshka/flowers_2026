export const dynamic = 'force-dynamic';
import { randomUUID } from 'crypto';
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
  mediaLibrary?: Array<{ id: string; url: string; createdAt?: string }>;
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
  'mediaLibrary',
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
      const backgrounds: Record<string, string> = {};
      for (const [rawKey, item] of Object.entries(value as Record<string, unknown>)) {
        const key = rawKey.trim();
        if (!key) continue;
        const normalized = sanitizeString(item);
        if (normalized !== undefined) {
          backgrounds[key] = normalized;
        }
      }
      sanitizedBody.homeCategoryCardBackgrounds = backgrounds;
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
      continue;
    }

    if (field === 'mediaLibrary' && Array.isArray(value)) {
      const cleaned: Array<{ id: string; url: string; createdAt?: string }> = [];
      for (const item of value) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const rec = item as Record<string, unknown>;
        const url = sanitizeString(rec.url);
        if (!url) continue;
        const id =
          typeof rec.id === 'string' && rec.id.trim().length > 0 ? rec.id.trim() : randomUUID();
        const createdAt =
          typeof rec.createdAt === 'string' && rec.createdAt.trim().length > 0
            ? rec.createdAt.trim()
            : undefined;
        cleaned.push(createdAt ? { id, url, createdAt } : { id, url });
        if (cleaned.length >= 400) break;
      }
      sanitizedBody.mediaLibrary = cleaned;
      continue;
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

  const { mediaLibrary: _adminMediaLibrary, ...rest } = settings;

  return {
    ...rest,
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
    mediaLibrary: [],
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
