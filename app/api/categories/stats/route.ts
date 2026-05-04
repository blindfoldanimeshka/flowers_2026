export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

function isMissingColumnError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  const code = String((error as { code?: string })?.code || '');
  return code === 'PGRST204' || (message.includes('column') && message.includes('does not exist'));
}

export const GET = withErrorHandler(async (request: NextRequest) => {
    // Получаем все продукты для подсчета статистики
    let { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, category_id, subcategory_id')
      .eq('is_active', true);

    if (productsError && isMissingColumnError(productsError)) {
      const retry = await supabase.from('products').select('id, category_id, subcategory_id');
      products = retry.data;
      productsError = retry.error;
    }

    if (productsError) {
      productionLogger.error('[CATEGORIES STATS] Products fetch error:', productsError);
      return NextResponse.json(
        { success: false, error: 'Ошибка получения данных о продуктах' },
        { status: 500 }
      );
    }

    // Получаем все категории
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);

    if (categoriesError) {
      productionLogger.error('[CATEGORIES STATS] Categories fetch error:', categoriesError);
      return NextResponse.json(
        { success: false, error: 'Ошибка получения данных о категориях' },
        { status: 500 }
      );
    }

    // Получаем все подкатегории
    const { data: allSubcategories, error: subcategoriesError } = await supabase
      .from('subcategories')
      .select('*')
      .eq('is_active', true);

    if (subcategoriesError) {
      productionLogger.error('[CATEGORIES STATS] Subcategories fetch error:', subcategoriesError);
      return NextResponse.json(
        { success: false, error: 'Ошибка получения данных о подкатегориях' },
        { status: 500 }
      );
    }

    // Подсчитываем статистику продуктов по категориям
    const categoryStatsMap = new Map<string, number>();
    const subcategoryStatsMap = new Map<string, number>();

    (products || []).forEach(product => {
      const categoryId = product.category_id;
      const subcategoryId = product.subcategory_id;

      if (categoryId) {
        categoryStatsMap.set(categoryId, (categoryStatsMap.get(categoryId) || 0) + 1);
      }

      if (subcategoryId) {
        subcategoryStatsMap.set(subcategoryId, (subcategoryStatsMap.get(subcategoryId) || 0) + 1);
      }
    });

    // Группируем подкатегории по категориям
    const subcategoriesByCategory = (allSubcategories || []).reduce((acc: Record<string, typeof allSubcategories>, sub: any) => {
      const categoryId = sub.category_id;
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push({
        ...sub,
        productCount: subcategoryStatsMap.get(sub.id) || 0
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Обогащаем категории статистикой
    const enrichedCategories = (categories || []).map((category: any) => {
      const categoryProductCount = categoryStatsMap.get(category.id) || 0;
      const enrichedSubcategories = subcategoriesByCategory[category.id] || [];

      const subcategoriesProductCount = enrichedSubcategories.reduce(
        (sum: number, sub: any) => sum + (sub.productCount || 0),
        0
      );

      const totalProductCount = categoryProductCount + subcategoriesProductCount;

      return {
        _id: category.id,
        id: category.legacy_id || category.id,
        name: category.name,
        slug: category.slug,
        isActive: category.is_active ?? true,
        productCount: categoryProductCount,
        subcategoriesProductCount,
        totalProductCount,
        subcategories: enrichedSubcategories
      };
    });

    return NextResponse.json({
      success: true,
      categories: enrichedCategories,
      summary: {
        totalCategories: (categories || []).length,
        totalSubcategories: (allSubcategories || []).length,
        totalProducts: (products || []).length
      }
    });
});
