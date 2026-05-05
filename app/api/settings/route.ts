export const dynamic = 'force-dynamic';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { invalidateSettingsCache } from '@/lib/cache';
import { requireAdmin } from '@/lib/auth';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';

interface SettingsUpdatePayload {
  siteName?: string;
  siteDescription?: string;
  contactPhone?: string;
  contactPhone2?: string;
  contactPhone3?: string;
  address?: string;
  workingHours?: string;
  pickupHours?: string;
  deliveryHours?: string;
  deliveryInfo?: string;
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
  tgId?: string[];
}

const SETTINGS_KEY = 'global-settings';

async function getSettingsRow() {
  const byId = await supabase.from('settings').select('*').eq('id', SETTINGS_KEY).maybeSingle();
  if (!byId.error && byId.data) return byId;

  return byId;
}

const ALLOWED_FIELDS: (keyof SettingsUpdatePayload)[] = [
  'siteName',
  'siteDescription',
  'contactPhone',
  'contactPhone2',
  'contactPhone3',
  'address',
  'workingHours',
  'pickupHours',
  'deliveryHours',
  'deliveryInfo',
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
  'tgId',
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
      field === 'contactPhone2' ||
      field === 'contactPhone3' ||
      field === 'address' ||
      field === 'workingHours' ||
      field === 'pickupHours' ||
      field === 'deliveryHours' ||
      field === 'deliveryInfo' ||
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

    if (field === 'tgId' && Array.isArray(value)) {
      const tgIds: string[] = [];
      for (const item of value) {
        const strValue = typeof item === 'number' ? String(item) : typeof item === 'string' ? item.trim() : '';
        if (strValue && /^\d+$/.test(strValue)) {
          tgIds.push(strValue);
        }
      }
      if (tgIds.length > 0) {
        sanitizedBody.tgId = tgIds as any;
      }
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
      contactPhone2: '',
      contactPhone3: '',
      address: '',
      workingHours: '',
      pickupHours: '',
      deliveryHours: '',
      deliveryInfo: '',
      socialLinks: {},
      homeCategoryCardBackgrounds: {},
      homeBannerBackground: '',
      homeBannerSlides: [],
      tgId: [],
    };
  }

  const { mediaLibrary: _adminMediaLibrary, ...rest } = settings;
  const homeBannerSlidesValue = settings.homeBannerSlides ?? settings.home_banner_slides;

  return {
    ...rest,
    siteName: String(settings.siteName ?? settings.site_name ?? ''),
    siteDescription: String(settings.siteDescription ?? settings.site_description ?? ''),
    contactPhone: String(settings.contactPhone ?? settings.contact_phone ?? ''),
    contactPhone2: String(settings.contactPhone2 ?? settings.contact_phone2 ?? ''),
    contactPhone3: String(settings.contactPhone3 ?? settings.contact_phone3 ?? ''),
    address: String(settings.address ?? ''),
    workingHours: String(settings.workingHours ?? settings.working_hours ?? ''),
    pickupHours: String(settings.pickupHours ?? settings.pickup_hours ?? ''),
    deliveryHours: String(settings.deliveryHours ?? settings.delivery_hours ?? ''),
    deliveryInfo: String(settings.deliveryInfo ?? settings.delivery_info ?? ''),
    homeCategoryCardBackgrounds:
      typeof (settings.homeCategoryCardBackgrounds ?? settings.home_category_card_backgrounds) === 'object' &&
      (settings.homeCategoryCardBackgrounds ?? settings.home_category_card_backgrounds) !== null &&
      !Array.isArray(settings.homeCategoryCardBackgrounds ?? settings.home_category_card_backgrounds)
        ? (settings.homeCategoryCardBackgrounds ?? settings.home_category_card_backgrounds)
        : {},
    homeBannerBackground:
      typeof (settings.homeBannerBackground ?? settings.home_banner_background) === 'string'
        ? String(settings.homeBannerBackground ?? settings.home_banner_background)
        : '',
    homeBannerSlides: Array.isArray(homeBannerSlidesValue)
      ? homeBannerSlidesValue
          .filter((item: unknown): item is string => typeof item === 'string')
          .slice(0, 6)
      : [],
    socialLinks:
      typeof (settings.socialLinks ?? settings.social_links) === 'object' &&
      (settings.socialLinks ?? settings.social_links) !== null &&
      !Array.isArray(settings.socialLinks ?? settings.social_links)
        ? (settings.socialLinks ?? settings.social_links)
        : {},
    tgId: Array.isArray(settings.tgId ?? settings.tg_id) ? (settings.tgId ?? settings.tg_id) : [],
  };
}

async function updateOrCreateSettings(body: Record<string, unknown>): Promise<any> {
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

  const payload = { ...defaultSettings, ...sanitizedBody };
  const dbPayload = {
    id: SETTINGS_KEY,
    site_name: payload.siteName,
    site_description: payload.siteDescription,
    contact_phone: payload.contactPhone,
    contact_phone2: payload.contactPhone2 ?? null,
    contact_phone3: payload.contactPhone3 ?? null,
    address: payload.address,
    working_hours: payload.workingHours,
    pickup_hours: payload.pickupHours ?? null,
    delivery_hours: payload.deliveryHours ?? null,
    delivery_info: payload.deliveryInfo ?? null,
    delivery_radius: payload.deliveryRadius,
    min_order_amount: payload.minOrderAmount,
    free_delivery_threshold: payload.freeDeliveryThreshold,
    delivery_fee: payload.deliveryFee,
    currency: payload.currency,
    timezone: payload.timezone,
    maintenance_mode: payload.maintenanceMode,
    seo_title: payload.seoTitle ?? null,
    seo_description: payload.seoDescription ?? null,
    seo_keywords: payload.seoKeywords ?? null,
    social_links: payload.socialLinks ?? {},
    home_category_card_backgrounds: payload.homeCategoryCardBackgrounds ?? {},
    home_banner_background: payload.homeBannerBackground ?? '',
    home_banner_slides: payload.homeBannerSlides ?? [],
    media_library: payload.mediaLibrary ?? [],
    tg_id: payload.tgId ?? null,
  };
  const byIdUpsert = await supabase
    .from('settings')
    .upsert(dbPayload, { onConflict: 'id', ignoreDuplicates: false })
    .select('*')
    .single();

  const settings = byIdUpsert.data;
  const error = byIdUpsert.error;

  if (error || !settings) {
    productionLogger.error('Supabase settings upsert error:', error);
    throw new Error(error?.message || 'Failed to update settings');
  }

  invalidateSettingsCache();
  return settings;
}

export const GET = withErrorHandler(async () => {
    const { data: settings, error } = await getSettingsRow();

    if (error) {
      productionLogger.error('Supabase settings fetch error:', error);
      return NextResponse.json({ settings: normalizePublicSettings(null) }, { status: 200 });
    }

    return NextResponse.json({ settings: normalizePublicSettings(settings) }, { status: 200 });
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const settings = await updateOrCreateSettings(body);

    return NextResponse.json({ settings }, { status: 200 });
  
});

export const POST = PUT;
