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
import { supabase } from '@/lib/supabase';

const USE_SUPABASE = process.env.USE_SUPABASE_CATALOG === 'true';

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

function toSafeNumber(input: unknown, fallback = 0): number {
  const next = typeof input === 'number' ? input : Number(input);
  return Number.isFinite(next) ? next : fallback;
}

function mapSupabaseSubcategory(sub: any, fallbackCategoryNumId = 0) {
  return {
    _id: sub.id,
    name: sub.name,
    slug: sub.slug,
    categoryId: sub.category_id,
    categoryNumId: toSafeNumber(sub.category_num_id ?? sub.categoryNumId, fallbackCategoryNumId),
    isActive: sub.is_active ?? true,
  };
}

function mapSupabaseCategory(category: any, subcategories: any[] = []) {
  const categoryNumId = toSafeNumber(category.legacy_id ?? category.id, 0);
  return {
    _id: category.id,
    id: categoryNumId,
    name: category.name,
    slug: category.slug,
    isActive: category.is_active ?? true,
    subcategories: subcategories.map((sub) => mapSupabaseSubcategory(sub, categoryNumId)),
  };
}

// GET all categories with their subcategories
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    // Use Supabase if enabled
    if (USE_SUPABASE) {
      if (slug) {
        const { data: category, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', slug)
          .single();

        if (categoryError || !category) {
          return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
        }

        const { data: subcategories } = await supabase
          .from('subcategories')
          .select('*')
          .eq('category_id', category.id);

        return NextResponse.json(mapSupabaseCategory(category, subcategories || []), { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } });
      }

      // Get all categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('legacy_id', { ascending: true });

      if (categoriesError) {
        productionLogger.error('Supabase categories fetch error:', categoriesError);
        return NextResponse.json({ error: categoriesError.message }, { status: 500 });
      }

      const { data: allSubcategories } = await supabase
        .from('subcategories')
        .select('*');

      const subcategoriesByCategory = (allSubcategories || []).reduce((acc: any, sub: any) => {
        const categoryId = sub.category_id;
        if (!acc[categoryId]) {
          acc[categoryId] = [];
        }
        acc[categoryId].push({
          _id: sub.id,
          name: sub.name,
          slug: sub.slug,
          categoryId: sub.category_id,
          isActive: sub.is_active ?? true,
        });
        return acc;
      }, {});

      const populatedCategories = (categories || []).map((category: any) =>
        mapSupabaseCategory(category, subcategoriesByCategory[category.id] || [])
      );

      return NextResponse.json(populatedCategories, {
        headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL },
      });
    }

    // Use MongoDB if Supabase is not enabled
    await connect();

    if (slug) {
      const category = await Category.findOne({ slug }).select(CATEGORY_FIELDS).lean();
      if (!category) {
        return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
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

    // Полный список категорий и подкатегорий для навигации
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
    const body = await request.json();
    const { name } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Название категории обязательно' }, { status: 400 });
    }

    if (USE_SUPABASE) {
      const trimmedName = name.trim();
      const existingByName = await supabase.from('categories').select('*').ilike('name', trimmedName).limit(1).maybeSingle();
      if (existingByName.data) {
        return NextResponse.json(
          {
            error: 'Категория с таким названием уже существует',
            existingCategory: {
              id: existingByName.data.id,
              name: existingByName.data.name,
              slug: existingByName.data.slug,
            },
          },
          { status: 400 }
        );
      }

      const baseSlug = slugify(trimmedName, { lower: true, strict: true }) || `category-${Date.now()}`;
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const { data: existingSlugCategory, error: slugError } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        if (slugError) {
          productionLogger.error('Supabase category slug check error:', slugError);
          return NextResponse.json({ error: slugError.message }, { status: 500 });
        }
        if (!existingSlugCategory) break;
        slug = `${baseSlug}-${counter++}`;
      }

      const { data: lastCategory } = await supabase
        .from('categories')
        .select('legacy_id')
        .order('legacy_id', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newLegacyId = toSafeNumber(lastCategory?.legacy_id, 0) + 1;
      const { data: created, error: createError } = await supabase
        .from('categories')
        .insert({
          legacy_id: newLegacyId,
          name: trimmedName,
          slug,
          is_active: true,
        })
        .select('*')
        .single();

      if (createError || !created) {
        productionLogger.error('Supabase category create error:', createError);
        return NextResponse.json({ error: createError?.message || 'Ошибка создания категории' }, { status: 500 });
      }

      invalidateCategoriesCache();
      return NextResponse.json(mapSupabaseCategory(created, []), { status: 201 });
    }

    await connect();
    
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

        if (USE_SUPABASE) {
            const supabaseUpdate: Record<string, unknown> = {};
            if (typeof updateData.name === 'string') supabaseUpdate.name = updateData.name;
            if (typeof updateData.slug === 'string') supabaseUpdate.slug = updateData.slug;
            if (typeof updateData.isActive === 'boolean') supabaseUpdate.is_active = updateData.isActive;

            const { data, error } = await supabase
              .from('categories')
              .update(supabaseUpdate)
              .eq('id', id)
              .select('*')
              .single();

            if (error || !data) {
              productionLogger.error('Supabase category update error:', error);
              return NextResponse.json({ error: error?.message || 'Категория не найдена' }, { status: error ? 500 : 404 });
            }

            invalidateCategoriesCache();
            return NextResponse.json(mapSupabaseCategory(data, []));
        }

        await connect();

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
