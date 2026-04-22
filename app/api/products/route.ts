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

const CATALOG_FIELDS = '_id name price oldPrice description image images inStock preorderOnly assemblyTime stockQuantity stockUnit categoryId subcategoryId categoryNumId subcategoryNumId';
const PRODUCTS_CACHE_CONTROL = 'public, max-age=30, stale-while-revalidate=120';

type ProductQuery = Record<string, string | number>;
type ValidationErrorShape = {
  name?: string;
  message?: string;
  errors?: Record<string, { message?: string }>;
};

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

// GET all products
export const GET = withErrorHandler(async (request: NextRequest) => {
    await connect();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');
    const categoryNumId = searchParams.get('categoryNumId');
    const subcategoryNumId = searchParams.get('subcategoryNumId');
    const view = searchParams.get('view');

    const query: ProductQuery = {};
    
    // Р¤РёР»СЊС‚СЂР°С†РёСЏ РїРѕ ObjectId РєР°С‚РµРіРѕСЂРёРё
    if (categoryId) query.categoryId = categoryId;
    
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
    await connect();
    const body = sanitizeMongoObject(await request.json());
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
    await connect();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID С‚РѕРІР°СЂР° РѕР±СЏР·Р°С‚РµР»РµРЅ' }, { status: 400 });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return NextResponse.json({ error: 'РўРѕРІР°СЂ РЅРµ РЅР°Р№РґРµРЅ' }, { status: 404 });
    }

    return NextResponse.json({ message: 'РўРѕРІР°СЂ СѓСЃРїРµС€РЅРѕ СѓРґР°Р»С‘РЅ' });
  
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
    await connect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = sanitizeMongoObject(await request.json());
    const normalizedImages = normalizeProductImages(body.images);
    if (normalizedImages.images) {
      body.images = normalizedImages.images;
      body.image = normalizedImages.image;
    }

    if (!id) {
      return NextResponse.json({ error: 'ID С‚РѕРІР°СЂР° РѕР±СЏР·Р°С‚РµР»РµРЅ' }, { status: 400 });
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
