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
      priority: 1.0,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  try {
    // Получаем категории
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);

    if (catError || !categories) {
      console.error('Sitemap categories generation error:', catError);
      return staticPages;
    }

    const categoryPages: MetadataRoute.Sitemap = categories.map((category: any) => ({
      url: `${baseUrl}/category/${encodeURIComponent(category.slug)}`,
      lastModified: new Date(category.updated_at || category.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Получаем подкатегории
    const { data: subcategories, error: subError } = await supabase
      .from('subcategories')
      .select('*')
      .eq('is_active', true);

    const subcategoryPages: MetadataRoute.Sitemap = [];
    if (!subError && subcategories) {
      const categoryMap = new Map<string, string>(); // id -> slug
      categories.forEach((cat: any) => {
        categoryMap.set(cat.id, cat.slug);
      });

      subcategories.forEach((sub: any) => {
        const parentSlug = categoryMap.get(sub.category_id);
        if (parentSlug) {
          subcategoryPages.push({
            url: `${baseUrl}/category/${encodeURIComponent(parentSlug)}/${encodeURIComponent(sub.slug)}`,
            lastModified: new Date(sub.updated_at || sub.created_at),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          });
        }
      });
    } else if (subError) {
      console.error('Sitemap subcategories generation error:', subError);
    }

    // Товары не включены в sitemap, т.к. отдельные страницы товаров (/product/[id]) не существуют
    // Товары отображаются на страницах категорий

    return [...staticPages, ...categoryPages, ...subcategoryPages];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticPages;
  }
}
