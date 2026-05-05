export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import slugify from 'slugify';
import { invalidateCategoriesCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';

const PUBLIC_CACHE_CONTROL = 'public, max-age=30, stale-while-revalidate=120';

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
    image: category.image_url || category.image,
    isActive: category.is_active ?? true,
    subcategories: subcategories.map((sub) => mapSupabaseSubcategory(sub, categoryNumId)),
  };
}

// GET all categories with their subcategories
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

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
});

// POST a new category
export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    const { name } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Название категории обязательно' }, { status: 400 });
    }

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
});

// PUT to update a category
export const PUT = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
        return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim();
    if (typeof body.slug === 'string' && body.slug.trim()) updateData.slug = body.slug.trim();
    if (typeof body.isActive === 'boolean') updateData.is_active = body.isActive;

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Нет допустимых полей для обновления' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

    if (error || !data) {
        productionLogger.error('Supabase category update error:', error);
        return NextResponse.json({ error: error?.message || 'Категория не найдена' }, { status: error ? 500 : 404 });
    }

    invalidateCategoriesCache();
    return NextResponse.json(mapSupabaseCategory(data, []));
});

// DELETE a category - redirect to specific endpoint
export const DELETE = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
        return NextResponse.json(
            { success: false, error: 'ID категории обязателен. Используйте /api/categories/[id] для удаления конкретной категории.' }, 
            { status: 400 }
        );
    }
    
    return NextResponse.json(
        { 
            success: false, 
            error: 'Используйте DELETE /api/categories/[id] для удаления конкретной категории',
            redirect: `/api/categories/${id}`
        }, 
        { status: 405 }
    );
});
