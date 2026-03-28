import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import Product from '@/models/Product';
import { requireAdmin } from '@/lib/auth';
import { invalidateSettingsCache } from '@/lib/cache';

const SETTINGS_KEY = 'global-settings';
const MAX_LIBRARY_ITEMS = 400;

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
  if (typeof s.homeBannerBackground === 'string' && s.homeBannerBackground.trim()) {
    urls.push(s.homeBannerBackground.trim());
  }
  if (Array.isArray(s.homeBannerSlides)) {
    for (const u of s.homeBannerSlides) {
      if (typeof u === 'string' && u.trim()) urls.push(u.trim());
    }
  }
  const bg = s.homeCategoryCardBackgrounds;
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
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  await dbConnect();
  const settingsDoc = await Settings.findOne({ settingKey: SETTINGS_KEY }).lean();
  const settings = (settingsDoc || {}) as Record<string, unknown>;

  const products = await Product.find({}).select('image images').limit(800).lean();

  const map = new Map<string, { url: string; inLibrary: boolean; createdAt?: string }>();

  if (Array.isArray(settings.mediaLibrary)) {
    for (const item of settings.mediaLibrary) {
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

  for (const p of products) {
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

  const items = Array.from(map.values()).sort((a, b) => {
    if (a.inLibrary !== b.inLibrary) return a.inLibrary ? -1 : 1;
    if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
    return 0;
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const url = typeof body?.url === 'string' ? body.url.trim() : '';
  if (!url || url.length > 2048) {
    return NextResponse.json({ error: 'Некорректный URL' }, { status: 400 });
  }

  await dbConnect();
  const current = await Settings.findOne({ settingKey: SETTINGS_KEY }).lean();
  const existingLib = Array.isArray(current?.mediaLibrary) ? [...current.mediaLibrary] : [];

  if (existingLib.some((e: { url?: string }) => e?.url === url)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const entry = {
    id: randomUUID(),
    url,
    createdAt: new Date().toISOString(),
  };
  const nextLib = [entry, ...existingLib].slice(0, MAX_LIBRARY_ITEMS);

  if (!current) {
    await Settings.create({
      settingKey: SETTINGS_KEY,
      mediaLibrary: nextLib,
    });
  } else {
    await Settings.findOneAndUpdate({ settingKey: SETTINGS_KEY }, { $set: { mediaLibrary: nextLib } });
  }

  invalidateSettingsCache();
  return NextResponse.json({ ok: true, entry });
}
