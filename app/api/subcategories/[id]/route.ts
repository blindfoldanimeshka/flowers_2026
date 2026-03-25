export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Subcategory from '@/models/Subcategory';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { revalidatePath } from 'next/cache';
import { isValidId } from '@/lib/id';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';

// PUT - Update a subcategory by ID
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { id } = params;
    const { name } = await request.json();

    if (!isValidId(id)) {
      return NextResponse.json({ error: 'Неверный ID подкатегории' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Название подкатегории обязательно' }, { status: 400 });
    }

    const updatedSubcategory = await Subcategory.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedSubcategory) {
      return NextResponse.json({ error: 'Подкатегория не найдена' }, { status: 404 });
    }

    revalidatePath('/admin/categories');
    // Инвалидируем кэш категорий и подкатегорий
    invalidateCategoriesCache();
    invalidateSubcategoriesCache();

    return NextResponse.json(updatedSubcategory);
  } catch (error: any) {
    console.error('Ошибка при обновлении подкатегории:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE - Delete a subcategory by ID
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { id } = params;
    console.log('[SUBCATEGORY DELETE] Deleting subcategory with ID:', id);

    if (!isValidId(id)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат ID подкатегории' }, 
        { status: 400 }
      );
    }

    // Получаем query параметры
    const url = new URL(request.url);
    const forceDelete = url.searchParams.get('force') === 'true';

    // Find the subcategory to get the category reference
    const subcategory = await Subcategory.findById(id);
    
    if (!subcategory) {
      console.log('[SUBCATEGORY DELETE] Subcategory not found:', id);
      return NextResponse.json(
        { success: false, error: 'Подкатегория не найдена' }, 
        { status: 404 }
      );
    }

    // Check if there are any products associated with this subcategory
    const productCount = await Product.countDocuments({ subcategoryId: id });
    
    // Если есть товары и не принудительное удаление, возвращаем информацию
    if (productCount > 0 && !forceDelete) {
      console.log('[SUBCATEGORY DELETE] Cannot delete subcategory - has products:', productCount);
      return NextResponse.json(
        { 
          success: false, 
          error: 'В подкатегории есть товары',
          canForceDelete: true,
          productCount: productCount
        }, 
        { status: 409 }
      );
    }

    // Store the category ID before deletion
    const categoryId = subcategory.categoryId;
    console.log('[SUBCATEGORY DELETE] Found subcategory, category ID:', categoryId);

    // Если принудительное удаление и есть товары - удаляем их
    if (productCount > 0 && forceDelete) {
      await Product.deleteMany({ subcategoryId: id });
      console.log(`[SUBCATEGORY DELETE] Force deleted ${productCount} products`);
    }

    // Step 1: Delete the subcategory first
    const deletedSubcategory = await Subcategory.findByIdAndDelete(id);
    if (!deletedSubcategory) {
      console.error('[SUBCATEGORY DELETE] Failed to delete subcategory');
      return NextResponse.json(
        { success: false, error: 'Не удалось удалить подкатегорию' }, 
        { status: 500 }
      );
    }
    console.log('[SUBCATEGORY DELETE] ✅ Subcategory deleted');

    // Step 2: Remove the subcategory reference from the parent category
    const categoryUpdateResult = await Category.updateOne(
      { _id: categoryId },
      { $pull: { subcategories: id } }
    );
    
    if (categoryUpdateResult.modifiedCount === 0) {
      console.warn('[SUBCATEGORY DELETE] ⚠️ Category was not updated - may already be removed or category not found');
    } else {
      console.log('[SUBCATEGORY DELETE] ✅ Category updated successfully');
    }

    // Invalidate cache
    console.log('[SUBCATEGORY DELETE] Invalidating caches...');
    revalidatePath('/admin/categories');
    invalidateCategoriesCache();
    invalidateSubcategoriesCache();
    console.log('[SUBCATEGORY DELETE] ✅ Caches invalidated');

    const responseMessage = forceDelete && productCount > 0
      ? `Подкатегория и ${productCount} товаров успешно удалены`
      : 'Подкатегория успешно удалена';

    return NextResponse.json({ 
      success: true, 
      message: responseMessage,
      data: {
        deletedSubcategoryId: id,
        categoryId: categoryId,
        deletedProducts: forceDelete ? productCount : 0
      }
    });
  } catch (error: unknown) {
    console.error('[SUBCATEGORY DELETE] ❌ Error deleting subcategory:', error);
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при удалении подкатегории',
        details: errorMessage 
      }, 
      { status: 500 }
    );
  }
}
