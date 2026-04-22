import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import { isValidId } from '@/lib/id';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';

type CategoryRouteContext = { params: Promise<{ id: string }> };
const USE_SUPABASE = process.env.USE_SUPABASE_CATALOG === 'true';

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

export const GET = withErrorHandler(async (_request: NextRequest, { params }: CategoryRouteContext) => {
  const { id } = await params;

  if (USE_SUPABASE) {
    const { data: category, error: categoryError } = await supabase.from('categories').select('*').eq('id', id).single();
    if (categoryError || !category) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
    }

    const { data: subcategories, error: subError } = await supabase
      .from('subcategories')
      .select('*')
      .eq('category_id', id);

    if (subError) {
      productionLogger.error('Supabase subcategories fetch by category id error:', subError);
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    return NextResponse.json(mapSupabaseCategory(category, subcategories || []), { status: 200 });
  }

  await connect();
  const { default: Category } = await import('@/models/Category');
  const { default: Subcategory } = await import('@/models/Subcategory');

  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Неверный ID категории' }, { status: 400 });
  }

  const category = await Category.findById(id).lean();
  if (!category) {
    return NextResponse.json(
      { error: 'Категория не найдена' },
      { status: 404 }
    );
  }

  const subcategories = await Subcategory.find({ categoryId: id }).lean();
  return NextResponse.json({ ...category, subcategories }, { status: 200 });
});

export const PUT = withErrorHandler(async (request: Request, { params }: CategoryRouteContext) => {
  const { id } = await params;
  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name) {
    return NextResponse.json({ error: 'Название категории обязательно' }, { status: 400 });
  }

  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      productionLogger.error('Supabase category update by id error:', error);
      return NextResponse.json({ error: error?.message || 'Категория не найдена' }, { status: error ? 500 : 404 });
    }

    invalidateCategoriesCache();
    return NextResponse.json(mapSupabaseCategory(data));
  }

  await connect();
  const { default: Category } = await import('@/models/Category');

  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Неверный ID категории' }, { status: 400 });
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    id,
    { name },
    { new: true, runValidators: true }
  );

  if (!updatedCategory) {
    return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
  }

  invalidateCategoriesCache();
  return NextResponse.json(updatedCategory);
});

export const DELETE = withErrorHandler(async (_request: Request, { params }: CategoryRouteContext) => {
  const { id } = await params;

  if (USE_SUPABASE) {
    const { error: subDeleteError } = await supabase.from('subcategories').delete().eq('category_id', id);
    if (subDeleteError) {
      productionLogger.error('Supabase subcategories delete by category id error:', subDeleteError);
      return NextResponse.json({ error: subDeleteError.message }, { status: 500 });
    }

    const { error: categoryDeleteError } = await supabase.from('categories').delete().eq('id', id);
    if (categoryDeleteError) {
      productionLogger.error('Supabase category delete by id error:', categoryDeleteError);
      return NextResponse.json({ error: categoryDeleteError.message }, { status: 500 });
    }

    invalidateCategoriesCache();
    invalidateSubcategoriesCache();

    return NextResponse.json({
      message: 'Категория и связанные подкатегории удалены',
      deletedItems: {
        categories: 1,
      },
    });
  }

  await connect();
  const { default: Category } = await import('@/models/Category');
  const { default: Subcategory } = await import('@/models/Subcategory');
  const { default: Product } = await import('@/models/Product');

  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Неверный ID категории' }, { status: 400 });
  }

  const category = await Category.findById(id);
  if (!category) {
    return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
  }

  const subcategories = await Subcategory.find({ categoryId: id }).select('_id').lean();
  const subcategoryIds = subcategories.map((sub: any) => sub._id);

  const productsInCategory = await Product.countDocuments({ categoryId: id });
  const productsInSubcategories = await Product.countDocuments({
    subcategoryId: { $in: subcategoryIds }
  });
  const totalProducts = productsInCategory + productsInSubcategories;

  if (totalProducts > 0) {
    await Product.updateMany(
      { categoryId: id },
      { $set: { inStock: false } }
    );
    await Product.updateMany(
      { subcategoryId: { $in: subcategoryIds } },
      { $set: { inStock: false } }
    );
    productionLogger.info(`Помечено как "не в наличии" товаров: ${totalProducts}`);
  }

  await Subcategory.deleteMany({ categoryId: id });
  const deletedCategory = await Category.findByIdAndDelete(id);

  if (!deletedCategory) {
    return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
  }

  invalidateCategoriesCache();
  invalidateSubcategoriesCache();

  const responseMessage = totalProducts > 0
    ? `Категория и ${subcategories.length} подкатегорий удалены. ${totalProducts} товар(ов) помечены как "не в наличии"`
    : `Категория и ${subcategories.length} подкатегорий успешно удалены`;

  return NextResponse.json({
    message: responseMessage,
    deletedItems: {
      categories: 1,
      subcategories: subcategories.length,
      productsMarkedOutOfStock: totalProducts
    }
  });
});
