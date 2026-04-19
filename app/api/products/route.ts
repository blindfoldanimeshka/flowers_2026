export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Subcategory from '@/models/Subcategory';
import { revalidatePath } from 'next/cache';
import { sanitizeMongoObject } from '@/lib/security';

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
export async function GET(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('РћС€РёР±РєР° РїСЂРё РїРѕР»СѓС‡РµРЅРёРё С‚РѕРІР°СЂРѕРІ:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST a new product
export async function POST(request: NextRequest) {
  try {
    await connect();
    const body = sanitizeMongoObject(await request.json());
    const normalizedImages = normalizeProductImages(body.images);
    if (normalizedImages.images) {
      body.images = normalizedImages.images;
      body.image = normalizedImages.image;
    }
    Object.assign(body, normalizeProductMeta(body as Record<string, unknown>));

    // РџРѕР»СѓС‡Р°РµРј РєР°С‚РµРіРѕСЂРёСЋ РґР»СЏ С‡РёСЃР»РѕРІРѕРіРѕ ID
    if (body.categoryId) {
      const category = await Category.findById(body.categoryId);
      if (!category) {
        return NextResponse.json({ error: 'РљР°С‚РµРіРѕСЂРёСЏ РЅРµ РЅР°Р№РґРµРЅР°' }, { status: 404 });
      }
      body.categoryNumId = category.id; // РЈСЃС‚Р°РЅР°РІР»РёРІР°РµРј С‡РёСЃР»РѕРІРѕР№ ID РєР°С‚РµРіРѕСЂРёРё
    } else {
      return NextResponse.json({ error: 'ID РєР°С‚РµРіРѕСЂРёРё РѕР±СЏР·Р°С‚РµР»РµРЅ' }, { status: 400 });
    }

    // РћР±СЂР°Р±Р°С‚С‹РІР°РµРј РїРѕРґРєР°С‚РµРіРѕСЂРёСЋ, РµСЃР»Рё РѕРЅР° СѓРєР°Р·Р°РЅР°
    if (body.subcategoryId) {
      const subcategory = await Subcategory.findById(body.subcategoryId);
      if (!subcategory) {
        return NextResponse.json({ error: 'РџРѕРґРєР°С‚РµРіРѕСЂРёСЏ РЅРµ РЅР°Р№РґРµРЅР°' }, { status: 404 });
      }
      body.subcategoryNumId = subcategory.categoryNumId; // РЈСЃС‚Р°РЅР°РІР»РёРІР°РµРј С‡РёСЃР»РѕРІРѕР№ ID РїРѕРґРєР°С‚РµРіРѕСЂРёРё
    } else {
      // РЈРґР°Р»СЏРµРј subcategoryId РµСЃР»Рё РѕРЅРѕ РїСѓСЃС‚РѕРµ РёР»Рё null
      delete body.subcategoryId;
      delete body.subcategoryNumId;
    }

    const newProduct = await Product.create(body);

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/category', 'layout');

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: unknown) {
    const validationError = error as ValidationErrorShape;
    console.error('РћС€РёР±РєР° РїСЂРё СЃРѕР·РґР°РЅРёРё С‚РѕРІР°СЂР°:', error);
    if (validationError?.name === 'ValidationError') {
      const validationErrors = Object.values(validationError.errors || {})
        .map((err) => err?.message)
        .filter((msg): msg is string => Boolean(msg));
      return NextResponse.json({ error: 'РћС€РёР±РєР° РІР°Р»РёРґР°С†РёРё', details: validationErrors }, { status: 400 });
    }
    return NextResponse.json({ error: 'РћС€РёР±РєР° РїСЂРё СЃРѕР·РґР°РЅРёРё С‚РѕРІР°СЂР°', details: validationError?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('РћС€РёР±РєР° РїСЂРё СѓРґР°Р»РµРЅРёРё С‚РѕРІР°СЂР°:', error);
    return NextResponse.json({ error: 'РћС€РёР±РєР° РїСЂРё СѓРґР°Р»РµРЅРёРё С‚РѕРІР°СЂР°' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
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
    if (typeof body.categoryId === 'string' && body.categoryId.trim()) updateData.categoryId = body.categoryId.trim();
    if (typeof body.subcategoryId === 'string' && body.subcategoryId.trim()) updateData.subcategoryId = body.subcategoryId.trim();
    if (typeof body.image === 'string' && body.image.trim()) updateData.image = body.image.trim();
    if (Array.isArray(body.images)) updateData.images = body.images.filter((item: unknown) => typeof item === 'string').slice(0, 3);

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
  } catch (error) {
    console.error('РћС€РёР±РєР° РїСЂРё РѕР±РЅРѕРІР»РµРЅРёРё С‚РѕРІР°СЂР°:', error);
    // ... (error handling)
    return NextResponse.json({ error: 'РћС€РёР±РєР° РїСЂРё РѕР±РЅРѕРІР»РµРЅРёРё С‚РѕРІР°СЂР°' }, { status: 500 });
  }
}
