import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

function toSafeNumber(input: unknown, fallback = 0): number {
  const next = typeof input === 'number' ? input : Number(input);
  return Number.isFinite(next) ? next : fallback;
}

function mapSupabaseProduct(product: any) {
  return {
    _id: product.id,
    id: toSafeNumber(product.legacy_id ?? product.id, 0),
    name: product.name,
    slug: product.slug,
    price: product.price,
    description: product.description,
    images: product.images || [],
    subcategoryId: product.subcategory_id,
    isActive: product.is_active ?? true,
    isFeatured: product.is_featured ?? false,
    createdAt: product.created_at,
  };
}

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async () => {
    // Загружаем все подкатегории один раз
    const { data: subcategories } = await supabase
      .from('subcategories')
      .select('id, name');

    const subcategoryMap = new Map((subcategories || []).map(sub => [sub.id, sub.name]));

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      productionLogger.error('[FEATURED PRODUCTS] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Добавляем имя подкатегории к каждому продукту
    const productsWithSubcategory = (products || []).map(product => ({
      ...mapSupabaseProduct(product),
      subcategoryName: subcategoryMap.get(product.subcategory_id) || 'Без категории',
    }));

    return NextResponse.json(productsWithSubcategory);
});

// Этот маршрут может использовать только GET 