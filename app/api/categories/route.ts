export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import slugify from 'slugify';
import connect from '@/lib/db';
import Category from '@/models/Category';
import Subcategory from '@/models/Subcategory';
import { invalidateCategoriesCache } from '@/lib/cache';
import { escapeRegExp, sanitizeMongoObject } from '@/lib/security';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

const CATEGORY_FIELDS = '_id id name slug isActive';
const SUBCATEGORY_FIELDS = '_id name slug categoryId categoryNumId isActive';
const PUBLIC_CACHE_CONTROL = 'public, max-age=30, stale-while-revalidate=120';

type DuplicateKeyError = {
  code?: number;
  keyValue?: Record<string, unknown>;
};

function isDuplicateKeyError(error: unknown): error is DuplicateKeyError {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as DuplicateKeyError).code === 11000);
}

// GET all categories with their subcategories
export const GET = withErrorHandler(async (request: NextRequest) => {
    await connect();

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const category = await Category.findOne({ slug }).select(CATEGORY_FIELDS).lean();
      if (!category) {
        return NextResponse.json({ error: 'РљР°С‚РµРіРѕСЂРёСЏ РЅРµ РЅР°Р№РґРµРЅР°' }, { status: 404 });
      }

      const categorySubcategories = await Subcategory.find({ categoryId: category._id })
        .select(SUBCATEGORY_FIELDS)
        .lean();

      return NextResponse.json(
        {
          ...category,
          subcategories: categorySubcategories,
        },
        { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } }
      );
    }

    // РџРѕР»РЅС‹Р№ СЃРїРёСЃРѕРє РєР°С‚РµРіРѕСЂРёР№ Рё РїРѕРґРєР°С‚РµРіРѕСЂРёР№ РґР»СЏ РЅР°РІРёРіР°С†РёРё
    const [categories, allSubcategories] = await Promise.all([
      Category.find({}).select(CATEGORY_FIELDS).sort({ order: 1, id: 1 }).lean(),
      Subcategory.find({}).select(SUBCATEGORY_FIELDS).lean(),
    ]);

    const subcategoriesByCategory = allSubcategories.reduce((acc, sub) => {
      const categoryId = sub.categoryId.toString();
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(sub);
      return acc;
    }, {} as Record<string, typeof allSubcategories>);

    const populatedCategories = categories.map((category) => {
      const categoryId = category._id.toString();
      return {
        ...category,
        subcategories: subcategoriesByCategory[categoryId] || [],
      };
    });

    return NextResponse.json(populatedCategories, {
      headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL },
    });

  
});

// POST a new category
export const POST = withErrorHandler(async (request: NextRequest) => {
    await connect();
    const body = await request.json();
    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: 'РќР°Р·РІР°РЅРёРµ РєР°С‚РµРіРѕСЂРёРё РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ' }, { status: 400 });
    }
    
    // РЎРЅР°С‡Р°Р»Р° РїСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ РєР°С‚РµРіРѕСЂРёРё СЃ С‚Р°РєРёРј РёРјРµРЅРµРј
    const existingByName = await Category.findOne({
      name: { $regex: new RegExp(`^${escapeRegExp(name.trim())}$`, 'i') }
    });
    
    if (existingByName) {
      return NextResponse.json({ 
        error: 'РљР°С‚РµРіРѕСЂРёСЏ СЃ С‚Р°РєРёРј РЅР°Р·РІР°РЅРёРµРј СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚',
        existingCategory: {
          id: existingByName._id,
          name: existingByName.name,
          slug: existingByName.slug
        }
      }, { status: 400 });
    }
    
    // Р“РµРЅРµСЂРёСЂСѓРµРј СѓРЅРёРєР°Р»СЊРЅС‹Р№ slug
    const baseSlug = slugify(name, { lower: true, strict: true }) || `category-${Date.now()}`;
    let slug = baseSlug;
    let counter = 1;
    
    // РќР°С…РѕРґРёРј СѓРЅРёРєР°Р»СЊРЅС‹Р№ slug
    while (await Category.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }
    
    
    // РЈР»СѓС‡С€РµРЅРЅР°СЏ Р»РѕРіРёРєР° РіРµРЅРµСЂР°С†РёРё ID
    const lastCategory = await Category.findOne().sort({ id: -1 }).lean();
    const newId = lastCategory && typeof lastCategory.id === 'number' ? lastCategory.id + 1 : 1;


    const newCategory = new Category({
      id: newId,
      name: name.trim(),
      slug: slug, // РСЃРїРѕР»СЊР·СѓРµРј СѓР¶Рµ СЃРіРµРЅРµСЂРёСЂРѕРІР°РЅРЅС‹Р№ СѓРЅРёРєР°Р»СЊРЅС‹Р№ slug
      subcategories: []
    });
    
    let savedCategory;
    try {
      savedCategory = await newCategory.save();
      // РРЅРІР°Р»РёРґРёСЂСѓРµРј РєСЌС€ РєР°С‚РµРіРѕСЂРёР№
      invalidateCategoriesCache();
    } catch (err: unknown) {
      if (isDuplicateKeyError(err) && err.keyValue) {
        // РћР±СЂР°Р±РѕС‚РєР° РѕС€РёР±РєРё РґСѓР±Р»РёСЂРѕРІР°РЅРёСЏ
        const key = Object.keys(err.keyValue)[0];
        const value = key ? err.keyValue[key] : '';
        return NextResponse.json(
          { error: `РџРѕР»Рµ \"${key}\" СЃРѕ Р·РЅР°С‡РµРЅРёРµРј \"${value}\" СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚.` },
          { status: 409 } // 409 Conflict
        );
      } else {
        // Р”СЂСѓРіРёРµ РѕС€РёР±РєРё РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё
        throw err;
      }
    }
    // TODO: trigger ISR invalidation if needed
    return NextResponse.json(savedCategory, { status: 201 });
  
});

// PUT to update a category
export const PUT = withErrorHandler(async (request: NextRequest) => {
        await connect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const body = sanitizeMongoObject(await request.json());

        if (!id) {
            return NextResponse.json({ error: 'ID РєР°С‚РµРіРѕСЂРёРё РѕР±СЏР·Р°С‚РµР»РµРЅ' }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim();
        if (typeof body.slug === 'string' && body.slug.trim()) updateData.slug = body.slug.trim();
        if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'Нет допустимых полей для обновления' }, { status: 400 });
        }

        const updatedCategory = await Category.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });

        if (!updatedCategory) {
            return NextResponse.json({ error: 'РљР°С‚РµРіРѕСЂРёСЏ РЅРµ РЅР°Р№РґРµРЅР°' }, { status: 404 });
        }

        // РРЅРІР°Р»РёРґРёСЂСѓРµРј РєСЌС€ РєР°С‚РµРіРѕСЂРёР№
        invalidateCategoriesCache();

        return NextResponse.json(updatedCategory);
    
});

// DELETE a category - redirect to specific endpoint
export const DELETE = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
        return NextResponse.json(
            { success: false, error: 'ID РєР°С‚РµРіРѕСЂРёРё РѕР±СЏР·Р°С‚РµР»РµРЅ. РСЃРїРѕР»СЊР·СѓР№С‚Рµ /api/categories/[id] РґР»СЏ СѓРґР°Р»РµРЅРёСЏ РєРѕРЅРєСЂРµС‚РЅРѕР№ РєР°С‚РµРіРѕСЂРёРё.' }, 
            { status: 400 }
        );
    }
    
    return NextResponse.json(
        { 
            success: false, 
            error: 'РСЃРїРѕР»СЊР·СѓР№С‚Рµ DELETE /api/categories/[id] РґР»СЏ СѓРґР°Р»РµРЅРёСЏ РєРѕРЅРєСЂРµС‚РЅРѕР№ РєР°С‚РµРіРѕСЂРёРё',
            redirect: `/api/categories/${id}`
        }, 
        { status: 405 }
    );
});
