export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

type RouteContext = { params: Promise<{ id: string }> };

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

function toSafeNumber(input: unknown, fallback = 0): number {
  const next = typeof input === 'number' ? input : Number(input);
  return Number.isFinite(next) ? next : fallback;
}

function mapSupabaseProduct(product: any) {
  const rawImages = normalizeStringArray(product.images);
  const image =
    (typeof product.image_url === 'string' && product.image_url.trim()) ||
    (typeof product.image === 'string' && product.image.trim()) ||
    rawImages[0] ||
    '';

  const images = Array.from(new Set([image, ...rawImages].filter(Boolean))).slice(0, 3);
  const categoryId = typeof product.category_id === 'string' ? product.category_id : (typeof product.categoryId === 'string' ? product.categoryId : '');
  const categoryIdsRaw = normalizeStringArray(product.category_ids ?? product.categoryIds);
  const categoryIds = categoryIdsRaw.length > 0 ? categoryIdsRaw : (categoryId ? [categoryId] : []);

  return {
    _id: product.id,
    name: product.name,
    description: typeof product.description === 'string' ? product.description : '',
    price: toSafeNumber(product.price, 0),
    oldPrice: product.old_price ?? product.oldPrice ?? undefined,
    image,
    images,
    inStock: typeof product.in_stock === 'boolean' ? product.in_stock : (typeof product.inStock === 'boolean' ? product.inStock : true),
    preorderOnly: typeof product.preorder_only === 'boolean' ? product.preorder_only : (typeof product.preorderOnly === 'boolean' ? product.preorderOnly : false),
    assemblyTime: typeof product.assembly_time === 'string' ? product.assembly_time : (typeof product.assemblyTime === 'string' ? product.assemblyTime : ''),
    stockQuantity: Math.max(0, Math.floor(toSafeNumber(product.stock_quantity ?? product.stockQuantity, 0))),
    stockUnit: typeof product.stock_unit === 'string' ? product.stock_unit : (typeof product.stockUnit === 'string' ? product.stockUnit : 'шт.'),
    categoryId,
    categoryIds,
    categoryNumId: toSafeNumber(product.category_num_id ?? product.categoryNumId, 0),
    subcategoryId: typeof product.subcategory_id === 'string' ? product.subcategory_id : (typeof product.subcategoryId === 'string' ? product.subcategoryId : ''),
    subcategoryNumId: toSafeNumber(product.subcategory_num_id ?? product.subcategoryNumId, 0),
    pinnedInCategory:
      typeof product.pinned_in_category === 'string'
        ? product.pinned_in_category
        : (typeof product.pinnedInCategory === 'string' ? product.pinnedInCategory : ''),
  };
}

export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteContext) => {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }
    productionLogger.error('Supabase product fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapSupabaseProduct(data));
});
