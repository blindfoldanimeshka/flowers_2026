export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isValidId } from '@/lib/id';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

type RouteContext = { params: Promise<{ subcategoryId: string }> };

function mapSupabaseProduct(product: any) {
  const rawImages = Array.isArray(product.images) ? product.images : [];
  const image = (typeof product.image_url === 'string' && product.image_url.trim()) ||
    (typeof product.image === 'string' && product.image.trim()) ||
    rawImages[0] || '';
  const images = Array.from(new Set([image, ...rawImages].filter(Boolean))).slice(0, 3);

  return {
    _id: product.id,
    name: product.name,
    description: typeof product.description === 'string' ? product.description : '',
    price: typeof product.price === 'number' ? product.price : 0,
    oldPrice: product.old_price ?? undefined,
    image,
    images,
    inStock: typeof product.in_stock === 'boolean' ? product.in_stock : true,
    categoryId: product.category_id || '',
    subcategoryId: product.subcategory_id || '',
  };
}

// GET запрос для получения товаров по ID подкатегории
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteContext) => {
    const { subcategoryId } = await params;

    // Проверка валидности subcategoryId
    if (!isValidId(subcategoryId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный формат ID подкатегории'
        },
        { status: 400 }
      );
    }

    // Проверяем, существует ли подкатегория
    const { data: subcategory, error: subcategoryError } = await supabase
      .from('subcategories')
      .select('id, name, slug, category_id')
      .eq('id', subcategoryId)
      .single();

    if (subcategoryError || !subcategory) {
      return NextResponse.json(
        {
          success: false,
          error: 'Подкатегория не найдена'
        },
        { status: 404 }
      );
    }

    // Получаем все товары в подкатегории
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('subcategory_id', subcategoryId);

    if (productsError) {
      productionLogger.error('Supabase products by subcategory error:', productsError);
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    // Get category info
    const { data: category } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('id', subcategory.category_id)
      .single();

    const products = (productsData || []).map(mapSupabaseProduct);

    return NextResponse.json({
      success: true,
      products,
      subcategory: {
        id: subcategory.id,
        name: subcategory.name,
        slug: subcategory.slug,
        category
      },
      count: products.length
    }, { status: 200 });
});
