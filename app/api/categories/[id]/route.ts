export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { invalidateCategoriesCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';

// PUT to update a category by ID
export const PUT = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim();
  if (typeof body.slug === 'string' && body.slug.trim()) updateData.slug = body.slug.trim();
  if (typeof body.isActive === 'boolean') updateData.is_active = body.isActive;
  if (typeof body.image === 'string') updateData.image = body.image.trim();

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
  return NextResponse.json(data);
});

// DELETE a category by ID
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 });
  }

  // Check if category has products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id')
    .contains('category_ids', [id])
    .limit(1);

  if (productsError) {
    productionLogger.error('Error checking products:', productsError);
    return NextResponse.json({ error: 'Ошибка проверки товаров' }, { status: 500 });
  }

  // If category has products, mark them as out of stock
  if (products && products.length > 0) {
    const { error: updateError } = await supabase
      .from('products')
      .update({ in_stock: false })
      .contains('category_ids', [id]);

    if (updateError) {
      productionLogger.error('Error updating products:', updateError);
      return NextResponse.json({ error: 'Ошибка обновления товаров' }, { status: 500 });
    }
  }

  // Delete subcategories first
  const { error: subcategoriesError } = await supabase
    .from('subcategories')
    .delete()
    .eq('category_id', id);

  if (subcategoriesError) {
    productionLogger.error('Error deleting subcategories:', subcategoriesError);
    return NextResponse.json({ error: 'Ошибка удаления подкатегорий' }, { status: 500 });
  }

  // Delete category
  const { error: deleteError } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (deleteError) {
    productionLogger.error('Error deleting category:', deleteError);
    return NextResponse.json({ error: 'Ошибка удаления категории' }, { status: 500 });
  }

  invalidateCategoriesCache();
  return NextResponse.json({ success: true, message: 'Категория успешно удалена' });
});
