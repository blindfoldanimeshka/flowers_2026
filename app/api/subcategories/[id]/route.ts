export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';

type RouteContext = { params: Promise<{ id: string }> };

// PUT - Update a subcategory by ID
export const PUT = withErrorHandler(async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Название подкатегории обязательно' }, { status: 400 });
    }

    const { data: updatedSubcategory, error } = await supabase
      .from('subcategories')
      .update({ name })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !updatedSubcategory) {
      productionLogger.error('Supabase subcategory update error:', error);
      return NextResponse.json({ error: error?.message || 'Подкатегория не найдена' }, { status: error ? 500 : 404 });
    }

    revalidatePath('/admin/categories');
    invalidateCategoriesCache();
    invalidateSubcategoriesCache();

    return NextResponse.json(updatedSubcategory);
});

// DELETE - Delete a subcategory by ID
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    productionLogger.info('[SUBCATEGORY DELETE] Deleting subcategory with ID:', id);

    // Get subcategory to get category reference
    const { data: subcategory, error: subError } = await supabase
      .from('subcategories')
      .select('category_id')
      .eq('id', id)
      .maybeSingle();

    if (subError || !subcategory) {
      productionLogger.info('[SUBCATEGORY DELETE] Subcategory not found:', id);
      return NextResponse.json(
        { success: false, error: 'Подкатегория не найдена' },
        { status: 404 }
      );
    }

    const categoryId = subcategory.category_id;
    productionLogger.info('[SUBCATEGORY DELETE] Found subcategory, category ID:', categoryId);

    // Check products count
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('subcategory_id', id);

    // Mark products as out of stock
    if (productCount && productCount >0) {
      const { error: productUpdateError } = await supabase
        .from('products')
        .update({ in_stock: false })
        .eq('subcategory_id', id);

      if (productUpdateError) {
        productionLogger.error('Supabase product update error:', productUpdateError);
      } else {
        productionLogger.info(`[SUBCATEGORY DELETE] Marked ${productCount} products as out of stock`);
      }
    }

    // Delete subcategory
    const { error: deleteError } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', id);

    if (deleteError) {
      productionLogger.error('Supabase subcategory delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Не удалось удалить подкатегорию' },
        { status: 500 }
      );
    }
    productionLogger.info('[SUBCATEGORY DELETE] ✅ Subcategory deleted');

    // Update category to remove subcategory reference (if using subcategories array)
    const { error: catUpdateError } = await supabase
      .from('categories')
      .update({ subcategories: supabase.rpc('array_remove', { array: 'subcategories', element: id }) }) // Adjust based on Supabase setup
      .eq('id', categoryId);

    if (catUpdateError) {
      productionLogger.warn('[SUBCATEGORY DELETE] ⚠️ Category update failed:', catUpdateError);
    } else {
      productionLogger.info('[SUBCATEGORY DELETE] ✅ Category updated successfully');
    }

    // Invalidate cache
    productionLogger.info('[SUBCATEGORY DELETE] Invalidating caches...');
    revalidatePath('/admin/categories');
    invalidateCategoriesCache();
    invalidateSubcategoriesCache();
    productionLogger.info('[SUBCATEGORY DELETE] ✅ Caches invalidated');

    const responseMessage = productCount && productCount >0
      ? `Подкатегория удалена. ${productCount} товар(ов) помечены как "не в наличии"`
      : 'Подкатегория успешно удалена';

    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: {
        deletedSubcategoryId: id,
        categoryId: categoryId,
        productsMarkedOutOfStock: productCount ||0
      }
    });
});
  
});
