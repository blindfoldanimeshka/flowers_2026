import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import connect from '@/lib/db';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Subcategory from '@/models/Subcategory';
import { isValidId } from '@/lib/id';
import { sanitizeMongoObject } from '@/lib/security';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';

type RouteContext = { params: Promise<{ id: string }> };
const USE_SUPABASE = process.env.USE_SUPABASE_CATALOG === 'true';
const OPTIONAL_SUPABASE_COLUMNS = [
  'images',
  'category_ids',
  'preorder_only',
  'assembly_time',
  'stock_quantity',
  'stock_unit',
  'pinned_in_category',
] as const;

function normalizeProductImages(input: unknown): { image?: string; images?: string[] } {
  const raw = Array.isArray(input) ? input : [];
  const images = Array.from(
    new Set(
      raw
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  ).slice(0, 3);

  if (images.length === 0) return {};
  return { image: images[0], images };
}

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

function isMissingColumnError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  const code = String((error as { code?: string })?.code || '');
  return code === 'PGRST204' || (message.includes('column') && message.includes('does not exist'));
}

function stripOptionalSupabaseColumns(payload: Record<string, unknown>) {
  const next = { ...payload };
  for (const key of OPTIONAL_SUPABASE_COLUMNS) {
    delete next[key];
  }
  return next;
}

// GET product by id
export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteContext) => {
  const { id } = await params;

  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error || !data) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    return NextResponse.json({ product: mapSupabaseProduct(data) }, { status: 200 });
  }

  await connect();

  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
  }

  const product = await Product.findById(id);
  if (!product) {
    return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
  }

  return NextResponse.json({ product }, { status: 200 });
});

// PUT product by id
export const PUT = withErrorHandler(async (request: NextRequest, { params }: RouteContext) => {
  const { id } = await params;
  const body = sanitizeMongoObject(await request.json());
  const normalizedImages = normalizeProductImages(body.images);
  if (normalizedImages.images) {
    body.images = normalizedImages.images;
    body.image = normalizedImages.image;
  }

  if (USE_SUPABASE) {
    const categoryIds = normalizeStringArray(body.categoryIds);
    const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : '';
    const mergedCategoryIds = categoryIds.length > 0 ? categoryIds : (categoryId ? [categoryId] : []);
    const pinnedInCategory = typeof body.pinnedInCategory === 'string' ? body.pinnedInCategory.trim() : '';

    if (pinnedInCategory && !mergedCategoryIds.includes(pinnedInCategory)) {
      return NextResponse.json({ error: 'Категория для закрепления должна быть в списке категорий товара' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim();
    if (typeof body.description === 'string') updateData.description = body.description.trim();
    if (typeof body.price !== 'undefined') updateData.price = toSafeNumber(body.price, 0);
    if (typeof body.inStock === 'boolean') updateData.in_stock = body.inStock;
    if (typeof body.preorderOnly === 'boolean') updateData.preorder_only = body.preorderOnly;
    if (typeof body.assemblyTime === 'string') updateData.assembly_time = body.assemblyTime.trim();
    if (typeof body.stockUnit === 'string') updateData.stock_unit = body.stockUnit.trim() || 'шт.';
    if (typeof body.stockQuantity !== 'undefined') updateData.stock_quantity = Math.max(0, Math.floor(toSafeNumber(body.stockQuantity, 0)));
    if (typeof body.image === 'string' && body.image.trim()) updateData.image_url = body.image.trim();
    if (Array.isArray(body.images)) updateData.images = normalizeStringArray(body.images).slice(0, 3);
    if (typeof body.categoryId === 'string' || Array.isArray(body.categoryIds)) {
      updateData.category_id = categoryId || mergedCategoryIds[0] || null;
      updateData.category_ids = mergedCategoryIds;
    }
    if (typeof body.subcategoryId === 'string') updateData.subcategory_id = body.subcategoryId.trim() || null;
    if (body.pinnedInCategory !== undefined) updateData.pinned_in_category = pinnedInCategory || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Нет допустимых полей для обновления' }, { status: 400 });
    }

    let { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error && isMissingColumnError(error)) {
      const fallbackPayload = stripOptionalSupabaseColumns(updateData);
      const retryResult = await supabase
        .from('products')
        .update(fallbackPayload)
        .eq('id', id)
        .select('*')
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error || !data) {
      productionLogger.error('Supabase product update by id error:', error);
      return NextResponse.json({ error: error?.message || 'Товар не найден' }, { status: error ? 500 : 404 });
    }

    revalidatePath('/');
    revalidatePath('/category', 'layout');

    return NextResponse.json({ product: mapSupabaseProduct(data) }, { status: 200 });
  }

  await connect();

  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim();
  if (typeof body.description === 'string') updateData.description = body.description;
  if (typeof body.price === 'number' && Number.isFinite(body.price) && body.price >= 0) updateData.price = body.price;
  if (typeof body.inStock === 'boolean') updateData.inStock = body.inStock;
  if (typeof body.preorderOnly === 'boolean') updateData.preorderOnly = body.preorderOnly;
  if (typeof body.assemblyTime === 'string') updateData.assemblyTime = body.assemblyTime.trim();
  if (typeof body.stockUnit === 'string' && body.stockUnit.trim()) updateData.stockUnit = body.stockUnit.trim();
  if (
    (typeof body.stockQuantity === 'number' && Number.isFinite(body.stockQuantity)) ||
    (typeof body.stockQuantity === 'string' && body.stockQuantity.trim())
  ) {
    const normalized = Number(body.stockQuantity);
    if (Number.isFinite(normalized) && normalized >= 0) {
      updateData.stockQuantity = Math.floor(normalized);
    }
  }
  const categoryIds = normalizeStringArray(body.categoryIds);
  const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : '';
  const mergedCategoryIds = Array.from(new Set(categoryIds.length > 0 ? categoryIds : (categoryId ? [categoryId] : [])));

  if (Array.isArray(body.categoryIds) || typeof body.categoryId === 'string') {
    if (mergedCategoryIds.length === 0) {
      return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 });
    }

    const existingCategories = await Category.find({ _id: { $in: mergedCategoryIds } }).select('_id id').lean();
    if (existingCategories.length !== mergedCategoryIds.length) {
      return NextResponse.json({ error: 'Одна или несколько категорий не найдены' }, { status: 404 });
    }

    updateData.categoryIds = mergedCategoryIds;
    updateData.categoryId = mergedCategoryIds[0];

    const primaryCategory = existingCategories.find((category) => String(category._id) === String(mergedCategoryIds[0]));
    if (primaryCategory && typeof primaryCategory.id === 'number') {
      updateData.categoryNumId = primaryCategory.id;
    }
  }

  if (typeof body.subcategoryId === 'string') {
    const nextSubcategoryId = body.subcategoryId.trim();
    if (nextSubcategoryId) {
      const subcategory = await Subcategory.findById(nextSubcategoryId).lean();
      if (!subcategory) {
        return NextResponse.json({ error: 'Подкатегория не найдена' }, { status: 404 });
      }
      updateData.subcategoryId = nextSubcategoryId;
      if (typeof subcategory.categoryNumId === 'number') {
        updateData.subcategoryNumId = subcategory.categoryNumId;
      }
    } else {
      updateData.subcategoryId = '';
      updateData.subcategoryNumId = 0;
    }
  }
  if (typeof body.image === 'string' && body.image.trim()) updateData.image = body.image.trim();
  if (Array.isArray(body.images)) updateData.images = body.images.filter((item: unknown) => typeof item === 'string').slice(0, 3);
  if (body.pinnedInCategory !== undefined) {
    const pinnedInCategory = typeof body.pinnedInCategory === 'string' ? body.pinnedInCategory.trim() : '';
    if (pinnedInCategory && mergedCategoryIds.length > 0 && !mergedCategoryIds.includes(pinnedInCategory)) {
      return NextResponse.json({ error: 'Категория для закрепления должна быть в списке категорий товара' }, { status: 400 });
    }
    updateData.pinnedInCategory = pinnedInCategory || '';
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Нет допустимых полей для обновления' }, { status: 400 });
  }

  const updatedProduct = await Product.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
  if (!updatedProduct) {
    return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
  }

  revalidatePath('/');
  revalidatePath('/category', 'layout');

  return NextResponse.json({ product: updatedProduct }, { status: 200 });
});

// DELETE product by id
export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: RouteContext) => {
  const { id } = await params;

  if (USE_SUPABASE) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      productionLogger.error('Supabase product delete by id error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath('/');
    revalidatePath('/category', 'layout');

    return NextResponse.json({ message: 'Товар успешно удален' }, { status: 200 });
  }

  await connect();

  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
  }

  const deletedProduct = await Product.findByIdAndDelete(id);
  if (!deletedProduct) {
    return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
  }

  revalidatePath('/');
  revalidatePath('/category', 'layout');

  return NextResponse.json({ message: 'Товар успешно удален' }, { status: 200 });
});
