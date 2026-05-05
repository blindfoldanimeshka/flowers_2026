import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { invalidateSettingsCache } from '@/lib/cache';
import { withErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';
import { supabaseUrl } from '@/lib/supabase';

const SETTINGS_KEY = 'global-settings';
const MAX_LIBRARY_ITEMS = 400;
const MEDIA_CACHE_TTL = 60000; // 1 минута
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';

let mediaCache: { items: any[]; timestamp: number } | null = null;

type LibraryEntry = { id: string; url: string; createdAt?: string };

function toPublicBucketUrl(path: string): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  const encoded = path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${encoded}`;
}

async function listBucketImageUrls(): Promise<string[]> {
  const urls: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list('', {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error || !Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      if (!name) continue;
      if (!/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(name)) continue;
      urls.push(toPublicBucketUrl(name));
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return urls;
}

async function getSettingsRow() {
  const byId = await supabase.from('settings').select('*').eq('id', SETTINGS_KEY).maybeSingle();
  if (!byId.error && byId.data) return byId;
  return byId;
}

function collectProductImageUrls(p: { image?: string; images?: string[] }): string[] {
  const urls: string[] = [];
  if (typeof p?.image === 'string' && p.image.trim()) urls.push(p.image.trim());
  if (Array.isArray(p?.images)) {
    for (const u of p.images) {
      if (typeof u === 'string' && u.trim()) urls.push(u.trim());
    }
  }
  return urls;
}

function collectSettingsImageUrls(s: Record<string, unknown> | null | undefined): string[] {
  const urls: string[] = [];
  if (!s) return urls;
  const homeBannerBackground = typeof s.homeBannerBackground === 'string'
    ? s.homeBannerBackground
    : typeof s.home_banner_background === 'string'
      ? s.home_banner_background
      : '';
  if (homeBannerBackground.trim()) {
    urls.push(homeBannerBackground.trim());
  }
  const homeBannerSlides = Array.isArray(s.homeBannerSlides)
    ? s.homeBannerSlides
    : Array.isArray(s.home_banner_slides)
      ? s.home_banner_slides
      : [];
  if (Array.isArray(homeBannerSlides)) {
    for (const u of homeBannerSlides) {
      if (typeof u === 'string' && u.trim()) urls.push(u.trim());
    }
  }
  const bg = s.homeCategoryCardBackgrounds || s.home_category_card_backgrounds;
  if (bg && typeof bg === 'object' && !Array.isArray(bg)) {
    for (const v of Object.values(bg)) {
      if (typeof v === 'string' && v.trim()) urls.push(v.trim());
    }
  }
  if (Array.isArray(s.mediaLibrary)) {
    for (const item of s.mediaLibrary) {
      if (item && typeof item === 'object' && 'url' in item && typeof (item as { url: unknown }).url === 'string') {
        const u = (item as { url: string }).url.trim();
        if (u) urls.push(u);
      }
    }
  }
  return urls;
}

/** Объединённые URL: явная медиатека + картинки товаров + оформление главной */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const now = Date.now();
  if (mediaCache && now - mediaCache.timestamp < MEDIA_CACHE_TTL) {
    return NextResponse.json({ items: mediaCache.items });
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Media library timeout')), 15000)
    );

    const dataPromise = (async () => {
      const { data: settingsDoc } = await getSettingsRow();
      const settings = (settingsDoc || {}) as Record<string, unknown>;

      const { data: products } = await supabase
        .from('products')
        .select('image, images')
        .limit(200);

      const map = new Map<string, { url: string; inLibrary: boolean; createdAt?: string }>();

      const mediaLibrary = Array.isArray(settings.mediaLibrary)
        ? settings.mediaLibrary
        : Array.isArray(settings.media_library)
          ? settings.media_library
          : [];
      if (Array.isArray(mediaLibrary)) {
        for (const item of mediaLibrary) {
          if (!item || typeof item !== 'object' || !('url' in item)) continue;
          const url = typeof (item as { url: unknown }).url === 'string' ? (item as { url: string }).url.trim() : '';
          if (!url) continue;
          const createdAt =
            'createdAt' in item && typeof (item as { createdAt?: string }).createdAt === 'string'
              ? (item as { createdAt: string }).createdAt
              : undefined;
          map.set(url, { url, inLibrary: true, createdAt });
        }
      }

      for (const p of products || []) {
        for (const u of collectProductImageUrls(p)) {
          if (!map.has(u)) {
            map.set(u, { url: u, inLibrary: false });
          }
        }
      }

      for (const u of collectSettingsImageUrls(settings)) {
        if (!map.has(u)) {
          map.set(u, { url: u, inLibrary: false });
        }
      }

      const bucketUrls = await listBucketImageUrls();
      for (const u of bucketUrls) {
        if (!map.has(u)) {
          map.set(u, { url: u, inLibrary: false });
        }
      }

      const items = Array.from(map.values()).sort((a, b) => {
        if (a.inLibrary !== b.inLibrary) return a.inLibrary ? -1 : 1;
        if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
        return 0;
      });

      return items;
    })();

    const items = await Promise.race([dataPromise, timeoutPromise]);

    mediaCache = { items, timestamp: now };
    return NextResponse.json({ items });
  } catch (error: any) {
    if (mediaCache) {
      return NextResponse.json({ items: mediaCache.items });
    }

    return NextResponse.json({ error: 'Ошибка загрузки медиатеки', items: [] }, { status: 500 });
  }
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { url?: unknown; action?: unknown } | null;

  if (body?.action === 'sync-bucket') {
    const { data: current } = await getSettingsRow();
    const existingLib: LibraryEntry[] = Array.isArray(current?.media_library)
      ? [...current.media_library]
      : Array.isArray(current?.mediaLibrary)
        ? [...current.mediaLibrary]
        : [];

    const knownUrls = new Set(existingLib.map((e) => (typeof e?.url === 'string' ? e.url : '')).filter(Boolean));
    const bucketUrls = await listBucketImageUrls();
    const additions: LibraryEntry[] = [];

    for (const url of bucketUrls) {
      if (knownUrls.has(url)) continue;
      knownUrls.add(url);
      additions.push({ id: randomUUID(), url, createdAt: new Date().toISOString() });
    }

    const nextLib = [...additions, ...existingLib].slice(0, MAX_LIBRARY_ITEMS);
    const { error } = await supabase
      .from('settings')
      .update({ media_library: nextLib })
      .eq('id', SETTINGS_KEY);

    if (error) {
      return NextResponse.json({ error: 'Ошибка синхронизации с bucket' }, { status: 500 });
    }

    invalidateSettingsCache();
    mediaCache = null;
    return NextResponse.json({ ok: true, synced: additions.length });
  }

  const url = typeof body?.url === 'string' ? body.url.trim() : '';
  if (!url || url.length > 2048) {
    return NextResponse.json({ error: 'Некорректный URL' }, { status: 400 });
  }

  const { data: current } = await getSettingsRow();

  const existingLib = Array.isArray(current?.media_library)
    ? [...current.media_library]
    : Array.isArray(current?.mediaLibrary)
      ? [...current.mediaLibrary]
      : [];

  if (existingLib.some((e: { url?: string }) => e?.url === url)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const entry = {
    id: randomUUID(),
    url,
    createdAt: new Date().toISOString(),
  };
  const nextLib = [entry, ...existingLib].slice(0, MAX_LIBRARY_ITEMS);

  const { error } = await supabase
    .from('settings')
    .update({ media_library: nextLib })
    .eq('id', SETTINGS_KEY);

  if (error) {
    return NextResponse.json({ error: 'Ошибка обновления медиатеки' }, { status: 500 });
  }

  invalidateSettingsCache();
  mediaCache = null;
  return NextResponse.json({ ok: true, entry });
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { url?: unknown; urls?: unknown } | null;
  const urls = Array.isArray(body?.urls)
    ? body!.urls.filter((u): u is string => typeof u === 'string').map((u) => u.trim()).filter(Boolean)
    : [];
  const singleUrl = typeof body?.url === 'string' ? body.url.trim() : '';
  const targets = Array.from(new Set([singleUrl, ...urls].filter(Boolean)));
  if (targets.length === 0) {
    return NextResponse.json({ error: 'URL не указан' }, { status: 400 });
  }

  const { data: current } = await getSettingsRow();

  const existingLib = Array.isArray(current?.media_library)
    ? [...current.media_library]
    : Array.isArray(current?.mediaLibrary)
      ? [...current.mediaLibrary]
      : [];

  const targetSet = new Set(targets);
  const filtered = existingLib.filter((e: { url?: string }) => !targetSet.has(String(e?.url || '')));

  if (filtered.length === existingLib.length) {
    return NextResponse.json({ error: 'Изображение не найдено в библиотеке' }, { status: 404 });
  }

  const { error } = await supabase
    .from('settings')
    .update({ media_library: filtered })
    .eq('id', SETTINGS_KEY);

  if (error) {
    return NextResponse.json({ error: 'Ошибка обновления медиатеки' }, { status: 500 });
  }

  invalidateSettingsCache();
  mediaCache = null;
  return NextResponse.json({ ok: true, deleted: targets.length });
});
