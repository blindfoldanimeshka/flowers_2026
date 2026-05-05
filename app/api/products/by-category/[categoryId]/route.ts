export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

type RouteContext = { params: Promise<{ categoryId: string }> };

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

// GET запрос для получения товаров по ID категории
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteContext) => {
    const { categoryId } = await params;

    if (!categoryId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный формат ID категории'
        },
        { status: 400 }
      );
    }

    // Get category from Supabase (assuming categories are in a separate table or in documents)
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('id', categoryId)
      .single();

    if (categoryError || !categoryData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Категория не найдена'
        },
        { status: 404 }
      );
    }

    // Get products where category_id = categoryId OR category_ids contains categoryId
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .or(`category_id.eq.${categoryId},category_ids.cs.{${categoryId}}`);

    if (productsError) {
      productionLogger.error('Supabase products by category error:', productsError);
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    const products = (productsData || []).map(mapSupabaseProduct);

    return NextResponse.json({
      success: true,
      products,
      category: {
        id: categoryData.id,
        name: categoryData.name,
        slug: categoryData.slug
      },
      count: products.length
    }, { status: 200 });
  
});
