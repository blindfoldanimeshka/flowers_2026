import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { productionLogger } from '@/lib/productionLogger';

export const dynamic = 'force-dynamic';

// GET products from Supabase
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');

    let query = supabase
      .from('products')
      .select('*')
      .eq('in_stock', true)
      .order('sort_order', { ascending: true });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (subcategoryId) {
      query = query.eq('subcategory_id', subcategoryId);
    }

    const { data, error } = await query;

    if (error) {
      productionLogger.error('Supabase products fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map Supabase fields to frontend format
    const products = (data || []).map((product: any) => ({
      _id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      oldPrice: product.old_price,
      image: product.image_url,
      images: product.image_url ? [product.image_url] : [],
      inStock: product.in_stock,
      preorderOnly: false,
      assemblyTime: '',
      stockQuantity: 0,
      stockUnit: 'шт.',
      categoryId: product.category_id,
      subcategoryId: product.subcategory_id,
    }));

    return NextResponse.json(products, {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' },
    });
  } catch (error) {
    productionLogger.error('Supabase products API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
