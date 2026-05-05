import { supabase } from '@/lib/supabase';

const STORAGE_BUCKET_CANDIDATES = Array.from(
  new Set(
    [
      process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS,
      process.env.SUPABASE_STORAGE_BUCKET,
      'product-images',
    ].filter((value): value is string => Boolean(value && value.trim()))
  )
);

/**
 * Преобразует путь изображения в публичный URL
 * Поддерживает:
 * - Пути вида /uploads/filename.ext -> публичный URL из Supabase
 * - Полные URL (https://...) -> возвращает как есть
 * - Относительные пути -> возвращает как есть
 */
export function getImageUrl(path: string | undefined | null): string {
  if (!path || typeof path !== 'string') {
    return '';
  }

  const trimmedPath = path.trim();

  // Если это уже полный URL, возвращаем как есть
  if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
    return trimmedPath;
  }

  // Если это путь /uploads/..., преобразуем в публичный URL из Supabase
  if (trimmedPath.startsWith('/uploads/')) {
    const filename = trimmedPath.replace(/^\/uploads\//, '');

    // Пробуем получить публичный URL из первого доступного bucket
    for (const bucket of STORAGE_BUCKET_CANDIDATES) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }

    // Если не удалось получить публичный URL, возвращаем путь через API
    return trimmedPath;
  }

  // Для всех остальных случаев возвращаем как есть
  return trimmedPath;
}

/**
 * Преобразует массив путей изображений в публичные URL
 */
export function getImageUrls(paths: (string | undefined | null)[]): string[] {
  return paths.map(getImageUrl).filter(Boolean);
}
