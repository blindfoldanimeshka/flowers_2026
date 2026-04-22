export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Subcategory from '@/models/Subcategory';
import { revalidatePath } from 'next/cache';
import { sanitizeMongoObject } from '@/lib/security';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';

const USE_SUPABASE = process.env.USE_SUPABASE_CATALOG === 'true';

const CATALOG_FIELDS = '_id name price oldPrice description image images inStock preorderOnly assemblyTime stockQuantity stockUnit categoryId subcategoryId categoryNumId subcategoryNumId';
const PRODUCTS_CACHE_CONTROL = 'public, max-age=30, stale-while-revalidate=120';

type ProductQuery = Record<string, unknown>;
type ValidationErrorShape = {
  name?: string;
  message?: string;
  errors?: Record<string, { message?: string }>;
};

type ProductBody = Record<string, unknown>;
const OPTIONAL_SUPABASE_COLUMNS = [
  'images',
  'category_ids',
  'category_num_id',
  'subcategory_num_id',
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

function normalizeProductMeta(input: Record<string, unknown>) {
  const preorderOnly = typeof input.preorderOnly === 'boolean' ? input.preorderOnly : false;
  const assemblyTime = typeof input.assemblyTime === 'string' ? input.assemblyTime.trim() : '';
  const stockUnit = typeof input.stockUnit === 'string' && input.stockUnit.trim() ? input.stockUnit.trim() : 'шт.';
  const rawStock = typeof input.stockQuantity === 'number' ? input.stockQuantity : Number(input.stockQuantity);
  const stockQuantity = Number.isFinite(rawStock) ? Math.max(0, Math.floor(rawStock)) : 0;

  return { preorderOnly, assemblyTime, stockUnit, stockQuantity };
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

function buildSupabaseProductPayload(body: ProductBody) {
  const normalizedImages = normalizeProductImages(body.images);
  if (normalizedImages.images) {
    body.images = normalizedImages.images;
    body.image = normalizedImages.image;
  }
  const meta = normalizeProductMeta(body);
  const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : '';
  const categoryIds = normalizeStringArray(body.categoryIds);
  const subcategoryId = typeof body.subcategoryId === 'string' ? body.subcategoryId.trim() : '';
  const image = typeof body.image === 'string' ? body.image.trim() : '';
  const images = normalizeStringArray(body.images);
  const pinnedInCategory = typeof body.pinnedInCategory === 'string' ? body.pinnedInCategory.trim() : '';
  const fallbackCategoryIds = categoryIds.length > 0 ? categoryIds : (categoryId ? [categoryId] : []);

  return {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
    price: toSafeNumber(body.price, 0),
    old_price: body.oldPrice ?? null,
    image_url: image || images[0] || '',
    images,
    in_stock: typeof body.inStock === 'boolean' ? body.inStock : true,
    preorder_only: meta.preorderOnly,
    assembly_time: meta.assemblyTime,
    stock_quantity: meta.stockQuantity,
    stock_unit: meta.stockUnit,
    category_id: categoryId || fallbackCategoryIds[0] || null,
    category_ids: fallbackCategoryIds,
    category_num_id: toSafeNumber(body.categoryNumId, 0),
    subcategory_id: subcategoryId || null,
    subcategory_num_id: toSafeNumber(body.subcategoryNumId, 0),
    pinned_in_category: pinnedInCategory || null,
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

// GET all products
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');
    const categoryNumId = searchParams.get('categoryNumId');
    const subcategoryNumId = searchParams.get('subcategoryNumId');
    const view = searchParams.get('view');

    // Use Supabase if enabled
    if (USE_SUPABASE) {
      const buildSupabaseQuery = (withCategoryArrayFilter: boolean) => {
        let query = supabase
          .from('products')
          .select('*')
          .order('sort_order', { ascending: true });

        if (categoryId) {
          query = withCategoryArrayFilter
            ? query.or(`category_id.eq.${categoryId},category_ids.cs.{${categoryId}}`)
            : query.eq('category_id', categoryId);
        }

        if (subcategoryId) {
          query = query.eq('subcategory_id', subcategoryId);
        }

        return query;
      };

      let { data, error } = await buildSupabaseQuery(true);
      if (error && isMissingColumnError(error) && categoryId) {
        const retryResult = await buildSupabaseQuery(false);
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        productionLogger.error('Supabase products fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const products = (data || []).map(mapSupabaseProduct);

      return NextResponse.json(products, {
        headers: { 'Cache-Control': PRODUCTS_CACHE_CONTROL },
      });
    }

    // Use MongoDB if Supabase is not enabled
    await connect();
    const query: ProductQuery = {};

    // Р¤РёР»СЊС‚СЂР°С†РёСЏ РїРѕ ObjectId РєР°С‚РµРіРѕСЂРёРё
    if (categoryId) query.$or = [{ categoryId }, { categoryIds: categoryId }];

    // Р¤РёР»СЊС‚СЂР°С†РёСЏ РїРѕ ObjectId РїРѕРґРєР°С‚РµРіРѕСЂРёРё
    if (subcategoryId) query.subcategoryId = subcategoryId;

    // Р¤РёР»СЊС‚СЂР°С†РёСЏ РїРѕ С‡РёСЃР»РѕРІРѕРјСѓ ID РєР°С‚РµРіРѕСЂРёРё
    if (categoryNumId) {
      const numId = parseInt(categoryNumId, 10);
      if (!isNaN(numId)) {
        query.categoryNumId = numId;
      }
    }

    // Р¤РёР»СЊС‚СЂР°С†РёСЏ РїРѕ С‡РёСЃР»РѕРІРѕРјСѓ ID РїРѕРґРєР°С‚РµРіРѕСЂРёРё
    if (subcategoryNumId) {
      const numId = parseInt(subcategoryNumId, 10);
      if (!isNaN(numId)) {
        query.subcategoryNumId = numId;
      }
    }

    const productsQuery = Product.find(query);
    if (view === 'catalog') {
      productsQuery.select(CATALOG_FIELDS);
    }

    const products = await productsQuery.lean();
    return NextResponse.json(products, {
      headers: { 'Cache-Control': PRODUCTS_CACHE_CONTROL },
    });

});

// POST a new product
export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = sanitizeMongoObject(await request.json());

    if (USE_SUPABASE) {
      const payload = buildSupabaseProductPayload(body as ProductBody);

      if (!payload.name) {
        return NextResponse.json({ error: 'Название товара обязательно' }, { status: 400 });
      }

      if (!payload.category_id) {
        return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 });
      }

      if (payload.pinned_in_category && !payload.category_ids.includes(payload.pinned_in_category)) {
        return NextResponse.json({ error: 'Категория для закрепления должна быть в списке категорий товара' }, { status: 400 });
      }

      let { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select('*')
        .single();

      if (error && isMissingColumnError(error)) {
        const fallbackPayload = stripOptionalSupabaseColumns(payload);
        const retryResult = await supabase.from('products').insert(fallbackPayload).select('*').single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        productionLogger.error('Supabase product create error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      revalidatePath('/');
      revalidatePath('/category', 'layout');
      return NextResponse.json(mapSupabaseProduct(data), { status: 201 });
    }

    await connect();
    const normalizedImages = normalizeProductImages(body.images);
    if (normalizedImages.images) {
      body.images = normalizedImages.images;
      body.image = normalizedImages.image;
    }
    Object.assign(body, normalizeProductMeta(body as Record<string, unknown>));

    // Обрабатываем массив категорий
    if (body.categoryIds && Array.isArray(body.categoryIds) && body.categoryIds.length > 0) {
      // Проверяем первую категорию для categoryNumId
      const category = await Category.findById(body.categoryIds[0]);
      if (!category) {
        return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
      }
      body.categoryId = body.categoryIds[0]; // Для обратной совместимости
      body.categoryNumId = category.id;
    } else if (body.categoryId) {
      // Обратная совместимость: если передан только categoryId
      const category = await Category.findById(body.categoryId);
      if (!category) {
        return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
      }
      body.categoryNumId = category.id;
      body.categoryIds = [body.categoryId];
    } else {
      return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 });
    }

    // Обрабатываем подкатегорию, если она указана
    if (body.subcategoryId) {
      const subcategory = await Subcategory.findById(body.subcategoryId);
      if (!subcategory) {
        return NextResponse.json({ error: 'Подкатегория не найдена' }, { status: 404 });
      }
      body.subcategoryNumId = subcategory.categoryNumId;
    } else {
      delete body.subcategoryId;
      delete body.subcategoryNumId;
    }

    // Проверяем pinnedInCategory
    if (body.pinnedInCategory) {
      if (!body.categoryIds.includes(body.pinnedInCategory)) {
        return NextResponse.json({ error: 'Категория для закрепления должна быть в списке категорий товара' }, { status: 400 });
      }
    }

    const newProduct = await Product.create(body);

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/category', 'layout');

    return NextResponse.json(newProduct, { status: 201 });

});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
    }

    if (USE_SUPABASE) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        productionLogger.error('Supabase product delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: 'Товар успешно удалён' });
    }

    await connect();

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return NextResponse.json({ error: 'РўРѕРІР°СЂ РЅРµ РЅР°Р№РґРµРЅ' }, { status: 404 });
    }

    return NextResponse.json({ message: 'РўРѕРІР°СЂ СѓСЃРїРµС€РЅРѕ СѓРґР°Р»С‘РЅ' });
  
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = sanitizeMongoObject(await request.json());
    const normalizedImages = normalizeProductImages(body.images);
    if (normalizedImages.images) {
      body.images = normalizedImages.images;
      body.image = normalizedImages.image;
    }

    if (!id) {
      return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
    }

    if (USE_SUPABASE) {
      const payload = buildSupabaseProductPayload(body as ProductBody);
      if (payload.pinned_in_category && !payload.category_ids.includes(payload.pinned_in_category)) {
        return NextResponse.json({ error: 'Категория для закрепления должна быть в списке категорий товара' }, { status: 400 });
      }

      const updatePayload: Record<string, unknown> = {};
      if (typeof body.name === 'string' && body.name.trim()) updatePayload.name = payload.name;
      if (typeof body.description === 'string') updatePayload.description = payload.description;
      if (typeof body.price !== 'undefined') updatePayload.price = payload.price;
      if (typeof body.oldPrice !== 'undefined') updatePayload.old_price = payload.old_price;
      if (typeof body.inStock === 'boolean') updatePayload.in_stock = payload.in_stock;
      if (typeof body.preorderOnly === 'boolean') updatePayload.preorder_only = payload.preorder_only;
      if (typeof body.assemblyTime === 'string') updatePayload.assembly_time = payload.assembly_time;
      if (typeof body.stockQuantity !== 'undefined') updatePayload.stock_quantity = payload.stock_quantity;
      if (typeof body.stockUnit === 'string') updatePayload.stock_unit = payload.stock_unit;
      if (typeof body.image === 'string' || Array.isArray(body.images)) updatePayload.image_url = payload.image_url;
      if (Array.isArray(body.images)) updatePayload.images = payload.images;
      if (typeof body.categoryId === 'string' || Array.isArray(body.categoryIds)) {
        updatePayload.category_id = payload.category_id;
        updatePayload.category_ids = payload.category_ids;
        updatePayload.category_num_id = payload.category_num_id;
      }
      if (typeof body.subcategoryId === 'string') {
        updatePayload.subcategory_id = payload.subcategory_id;
        updatePayload.subcategory_num_id = payload.subcategory_num_id;
      }
      if (body.pinnedInCategory !== undefined) updatePayload.pinned_in_category = payload.pinned_in_category;

      if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ error: 'Нет допустимых полей для обновления' }, { status: 400 });
      }

      let { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error && isMissingColumnError(error)) {
        const fallbackPayload = stripOptionalSupabaseColumns(updatePayload);
        const retryResult = await supabase
          .from('products')
          .update(fallbackPayload)
          .eq('id', id)
          .select('*')
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        productionLogger.error('Supabase product update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(mapSupabaseProduct(data));
    }

    await connect();

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
    if (typeof body.image === 'string' && body.image.trim()) updateData.image = body.image.trim();
    if (Array.isArray(body.images)) updateData.images = body.images.filter((item: unknown) => typeof item === 'string').slice(0, 3);

    // Обрабатываем массив категорий
    if (body.categoryIds && Array.isArray(body.categoryIds) && body.categoryIds.length > 0) {
      const category = await Category.findById(body.categoryIds[0]);
      if (!category) {
        return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
      }
      updateData.categoryId = body.categoryIds[0];
      updateData.categoryIds = body.categoryIds;
      updateData.categoryNumId = category.id;
    } else if (typeof body.categoryId === 'string' && body.categoryId.trim()) {
      // Обратная совместимость
      const category = await Category.findById(body.categoryId.trim());
      if (!category) {
        return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
      }
      updateData.categoryId = body.categoryId.trim();
      updateData.categoryIds = [body.categoryId.trim()];
      updateData.categoryNumId = category.id;
    }

    // Обрабатываем подкатегорию
    if (typeof body.subcategoryId === 'string' && body.subcategoryId.trim()) {
      const subcategory = await Subcategory.findById(body.subcategoryId.trim());
      if (!subcategory) {
        return NextResponse.json({ error: 'Подкатегория не найдена' }, { status: 404 });
      }
      updateData.subcategoryId = body.subcategoryId.trim();
      updateData.subcategoryNumId = subcategory.categoryNumId;
    }

    // Проверяем pinnedInCategory
    if (body.pinnedInCategory !== undefined) {
      if (body.pinnedInCategory === '' || body.pinnedInCategory === null) {
        updateData.pinnedInCategory = '';
      } else if (typeof body.pinnedInCategory === 'string') {
        const categoryIds = body.categoryIds || updateData.categoryIds;
        if (!categoryIds || !Array.isArray(categoryIds) || !categoryIds.includes(body.pinnedInCategory)) {
          return NextResponse.json({ error: 'Категория для закрепления должна быть в списке категорий товара' }, { status: 400 });
        }
        updateData.pinnedInCategory = body.pinnedInCategory;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Нет допустимых полей для обновления' }, { status: 400 });
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, { $set: updateData }, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return NextResponse.json({ error: 'РўРѕРІР°СЂ РЅРµ РЅР°Р№РґРµРЅ' }, { status: 404 });
    }

    return NextResponse.json(updatedProduct);
  
});
