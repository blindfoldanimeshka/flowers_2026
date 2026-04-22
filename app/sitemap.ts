import { MetadataRoute } from 'next';
import Category from '@/models/Category';
import Product from '@/models/Product';

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
    const categories = await Category.find({ isActive: true }).lean();
    const categoryPages: MetadataRoute.Sitemap = categories.map((category: any) => ({
      url: `${baseUrl}/category/${encodeURIComponent(category.slug)}`,
      lastModified: new Date(category.updatedAt || category.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Получаем товары
    const products = await Product.find({ inStock: true }).lean();
    const productPages: MetadataRoute.Sitemap = products.map((product: any) => ({
      url: `${baseUrl}/product/${encodeURIComponent(product._id)}`,
      lastModified: new Date(product.updatedAt || product.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      images: product.images && product.images.length > 0
        ? product.images
            .filter((img: string) => img && !img.includes('..'))
            .map((img: string) => `${baseUrl}${img}`)
        : product.image && !product.image.includes('..')
          ? [`${baseUrl}${product.image}`]
          : undefined,
    }));

    return [...staticPages, ...categoryPages, ...productPages];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticPages;
  }
}
