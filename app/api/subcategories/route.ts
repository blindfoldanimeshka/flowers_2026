export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import slugify from 'slugify';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';

// GET all subcategories
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const categoryId = searchParams.get('categoryId');
    const categoryNumId = searchParams.get('categoryNumId');

    let query = supabase.from('subcategories').select('*');

    if (slug) query = query.eq('slug', slug);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (categoryNumId) {
      const parsedCategoryNumId = Number.parseInt(categoryNumId, 10);
      if (!Number.isNaN(parsedCategoryNumId)) {
        query = query.eq('category_num_id', parsedCategoryNumId);
      }
    }

    if (slug) {
      const { data: subcategory, error } = await query.single();
      if (error || !subcategory) {
        return NextResponse.json(
          { success: false, error: 'Субкатегория не найдена' },
          { status: 404 }
        );
      }

      return NextResponse.json(subcategory);
    }

    const { data: subcategories, error } = await query;
    if (error) {
      productionLogger.error('Supabase subcategories fetch error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: subcategories || [] });
});

// POST a new subcategory
export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    const { name, categoryId, description, image, isActive } = body;

    productionLogger.info('[SUBCATEGORY API] Creating subcategory:', { name, categoryId });

    if (!name || !categoryId) {
      return NextResponse.json(
        { success: false, error: 'Имя и ID категории обязательны' },
        { status: 400 }
      );
    }

    // Check if category exists in Supabase
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, legacy_id, slug')
      .eq('id', categoryId)
      .maybeSingle();

    if (categoryError || !category) {
      productionLogger.error('Supabase category fetch error:', categoryError);
      return NextResponse.json(
        { success: false, error: 'Родительская категория не найдена' },
        { status: 404 }
      );
    }

    // Check existing subcategory
    const { data: existingSubcategory } = await supabase
      .from('subcategories')
      .select('id')
      .ilike('name', name.trim())
      .eq('category_id', categoryId)
      .maybeSingle();

    if (existingSubcategory) {
      return NextResponse.json(
        { success: false, error: 'Субкатегория с таким именем уже существует для этой категории' },
        { status: 409 }
      );
    }

    // Generate unique slug
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const { data: existingSlug } = await supabase
        .from('subcategories')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!existingSlug) break;
      slug = `${baseSlug}-${counter++}`;
    }

    // Insert new subcategory
    const subcategoryData = {
      name: name.trim(),
      slug,
      category_id: categoryId,
      category_num_id: category.legacy_id,
      description: description || '',
      image: image || '',
      is_active: isActive !== undefined ? isActive : true
    };

    const { data: savedSubcategory, error: insertError } = await supabase
      .from('subcategories')
      .insert(subcategoryData)
      .select('*')
      .single();

    if (insertError || !savedSubcategory) {
      productionLogger.error('Supabase subcategory insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError?.message || 'Ошибка создания субкатегории' },
        { status: 500 }
      );
    }

    productionLogger.info('[SUBCATEGORY API] Subcategory created successfully', savedSubcategory);

    // Invalidate caches
    try {
      invalidateCategoriesCache();
      invalidateSubcategoriesCache();
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/admin/categories');
      revalidatePath(`/category/${category.slug}`);
    } catch (cacheError) {
      productionLogger.warn('[SUBCATEGORY API] Error invalidating cache', { cacheError });
    }

    return NextResponse.json({ success: true, data: savedSubcategory }, { status: 201 });
});
