export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Subcategory from '@/models/Subcategory';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { revalidatePath } from 'next/cache';
import { isValidId } from '@/lib/id';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

type RouteContext = { params: Promise<{ id: string }> };

// PUT - Update a subcategory by ID
export const PUT = withErrorHandler(async (request: NextRequest, { params }: RouteContext) => {
    await dbConnect();
    const { id } = await params;
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
  
});

// DELETE - Delete a subcategory by ID
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteContext) => {
    await dbConnect();
    const { id } = await params;
    productionLogger.info('[SUBCATEGORY DELETE] Deleting subcategory with ID:', id);

    if (!isValidId(id)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат ID подкатегории' },
        { status: 400 }
      );
    }

    // Find the subcategory to get the category reference
    const subcategory = await Subcategory.findById(id);

    if (!subcategory) {
      productionLogger.info('[SUBCATEGORY DELETE] Subcategory not found:', id);
      return NextResponse.json(
        { success: false, error: 'Подкатегория не найдена' },
        { status: 404 }
      );
    }

    // Check if there are any products associated with this subcategory
    const productCount = await Product.countDocuments({ subcategoryId: id });

    // Store the category ID before deletion
    const categoryId = subcategory.categoryId;
    productionLogger.info('[SUBCATEGORY DELETE] Found subcategory, category ID:', categoryId);

    // Помечаем все товары подкатегории как "не в наличии"
    if (productCount > 0) {
      await Product.updateMany(
        { subcategoryId: id },
        { $set: { inStock: false } }
      );
      productionLogger.info(`[SUBCATEGORY DELETE] Marked ${productCount} products as out of stock`);
    }

    // Step 1: Delete the subcategory first
    const deletedSubcategory = await Subcategory.findByIdAndDelete(id);
    if (!deletedSubcategory) {
      productionLogger.error('[SUBCATEGORY DELETE] Failed to delete subcategory');
      return NextResponse.json(
        { success: false, error: 'Не удалось удалить подкатегорию' },
        { status: 500 }
      );
    }
    productionLogger.info('[SUBCATEGORY DELETE] ✅ Subcategory deleted');

    // Step 2: Remove the subcategory reference from the parent category
    const categoryUpdateResult = await Category.updateOne(
      { _id: categoryId },
      { $pull: { subcategories: id } }
    );

    if (categoryUpdateResult.modifiedCount === 0) {
      productionLogger.warn('[SUBCATEGORY DELETE] ⚠️ Category was not updated - may already be removed or category not found');
    } else {
      productionLogger.info('[SUBCATEGORY DELETE] ✅ Category updated successfully');
    }

    // Invalidate cache
    productionLogger.info('[SUBCATEGORY DELETE] Invalidating caches...');
    revalidatePath('/admin/categories');
    invalidateCategoriesCache();
    invalidateSubcategoriesCache();
    productionLogger.info('[SUBCATEGORY DELETE] ✅ Caches invalidated');

    const responseMessage = productCount > 0
      ? `Подкатегория удалена. ${productCount} товар(ов) помечены как "не в наличии"`
      : 'Подкатегория успешно удалена';

    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: {
        deletedSubcategoryId: id,
        categoryId: categoryId,
        productsMarkedOutOfStock: productCount
      }
    });
  
});
