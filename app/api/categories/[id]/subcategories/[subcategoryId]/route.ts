import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';
import { isValidId } from '@/lib/id';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

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

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string, subcategoryId: string }> }
) => {
    const { id, subcategoryId } = await params;

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    const { data: subcategory, error: subError } = await supabase
      .from('subcategories')
      .select('*')
      .eq('id', subcategoryId)
      .eq('category_id', id)
      .single();

    if (subError || !subcategory) {
      return NextResponse.json(
        { error: 'Подкатегория не найдена' },
        { status: 404 }
      );
    }

    return NextResponse.json(mapSupabaseSubcategory(subcategory), { status: 200 });
});

export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string, subcategoryId: string }> }
) => {
    const { id, subcategoryId } = await params;
    const body = await request.json();

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.name === 'string') updateData.name = body.name.trim();
    if (typeof body.slug === 'string') updateData.slug = body.slug.trim();
    if (typeof body.isActive === 'boolean') updateData.is_active = body.isActive;

    const { data: updated, error: updateError } = await supabase
      .from('subcategories')
      .update(updateData)
      .eq('id', subcategoryId)
      .eq('category_id', id)
      .select('*')
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'Подкатегория не найдена или ошибка обновления' },
        { status: updateError ? 500 : 404 }
      );
    }

    invalidateCategoriesCache();
    invalidateSubcategoriesCache();
    revalidatePath('/admin/categories');

    return NextResponse.json(mapSupabaseSubcategory(updated), { status: 200 });
});

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string, subcategoryId: string }> }
) => {
    const { id, subcategoryId } = await params;
    productionLogger.info('[CATEGORY SUBCATEGORY DELETE] Deleting subcategory:', { categoryId: id, subcategoryId });

    if (!isValidId(id) || !isValidId(subcategoryId)) {
      return NextResponse.json(
        { success: false, error: 'Некорректный формат ID' },
        { status: 400 }
      );
    }

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .single();

    if (categoryError || !category) {
      productionLogger.info('[CATEGORY SUBCATEGORY DELETE] Category not found:', id);
      return NextResponse.json(
        { success: false, error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    const { data: subcategory, error: subError } = await supabase
      .from('subcategories')
      .select('id, category_id')
      .eq('id', subcategoryId)
      .eq('category_id', id)
      .single();

    if (subError || !subcategory) {
      productionLogger.info('[CATEGORY SUBCATEGORY DELETE] Subcategory not found in category:', subcategoryId);
      return NextResponse.json(
        { success: false, error: 'Подкатегория не найдена' },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', subcategoryId);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: 'Ошибка удаления подкатегории' },
        { status: 500 }
      );
    }

    productionLogger.info('[CATEGORY SUBCATEGORY DELETE] Subcategory deleted successfully');

    revalidatePath('/admin/categories');
    invalidateCategoriesCache();
    invalidateSubcategoriesCache();

    return NextResponse.json(
      {
        success: true,
        message: 'Подкатегория успешно удалена',
        data: {
          deletedSubcategoryId: subcategoryId,
          categoryId: id
        }
      },
      { status: 200 }
    );
});

