import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600; // Cache for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://floramix24.ru';

  // Статические страницы
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/client/cart`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  try {
    // Получаем категории
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);

    if (error || !categories) {
      console.error('Sitemap generation error:', error);
      return staticPages;
    }

    const categoryPages: MetadataRoute.Sitemap = categories.map((category: any) => ({
      url: `${baseUrl}/category/${encodeURIComponent(category.slug)}`,
      lastModified: new Date(category.updated_at || category.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Товары не включены в sitemap, т.к. отдельные страницы товаров (/product/[id]) не существуют
    // Товары отображаются на страницах категорий

    return [...staticPages, ...categoryPages];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticPages;
  }
}
