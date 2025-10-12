import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connect from '@/lib/db';
import Category from '@/models/Category';
import { revalidatePath } from 'next/cache';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';

// GET запрос для получения конкретной подкатегории
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string, subcategoryId: string } }
) {
  try {
    await connect();
    
    const { id, subcategoryId } = params;
    const category = await Category.findById(id);
    
    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }
    
    const subcategory = category.subcategories.id(subcategoryId);
    
    if (!subcategory) {
      return NextResponse.json(
        { error: 'Подкатегория не найдена' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(subcategory, { status: 200 });
  } catch (error: unknown) {
    console.error(`Ошибка при получении подкатегории с ID ${params.subcategoryId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при получении подкатегории', 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// PUT запрос для обновления конкретной подкатегории
export async function PUT(
  request: NextRequest, 
  { params }: { params: { id: string, subcategoryId: string } }
) {
  try {
    await connect();
    
    const { id, subcategoryId } = params;
    const body = await request.json();
    
    // Находим категорию по ID
    const category = await Category.findById(id);
    
    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }
    
    // Проверяем, существует ли подкатегория с таким slug, но не с таким ID
    if (body.slug) {
      const slugExists = await Category.findOne({
        _id: { $ne: id },
        'subcategories.slug': body.slug
      });
      
      if (slugExists) {
        return NextResponse.json(
          { error: 'Подкатегория с таким slug уже существует' },
          { status: 400 }
        );
      }
    }
    
    // Обновляем подкатегорию в массиве
    const subcategoryIndex = category.subcategories.findIndex(
      (sc: any) => sc._id.toString() === subcategoryId
    );
    
    if (subcategoryIndex === -1) {
      return NextResponse.json(
        { error: 'Подкатегория не найдена' },
        { status: 404 }
      );
    }
    
    // Обновляем поля подкатегории
    Object.assign(category.subcategories[subcategoryIndex], body);
    
    await category.save();
    
    return NextResponse.json(category.subcategories[subcategoryIndex], { status: 200 });
  } catch (error: unknown) {
    console.error(`Ошибка при обновлении подкатегории с ID ${params.subcategoryId}:`, error);
    
    if (error instanceof Error) {
      if ('name' in error && error.name === 'ValidationError' && 'errors' in error) {
        const validationErrors = Object.values(error.errors as Record<string, { message: string }>).map(
          (err) => err.message
        );
        return NextResponse.json(
          { 
            success: false,
            error: 'Ошибка валидации', 
            details: validationErrors 
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Ошибка при обновлении подкатегории', 
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при обновлении подкатегории', 
        details: 'Неизвестная ошибка' 
      },
      { status: 500 }
    );
  }
}

// DELETE запрос для удаления конкретной подкатегории
export async function DELETE(
  request: NextRequest, 
  { params }: { params: { id: string, subcategoryId: string } }
) {
  try {
    await connect();
    
    const { id, subcategoryId } = params;
    console.log('[CATEGORY SUBCATEGORY DELETE] Deleting subcategory:', { categoryId: id, subcategoryId });
    
    // Проверяем валидность ID категории и подкатегории
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(subcategoryId)) {
      return NextResponse.json(
        { success: false, error: 'Некорректный формат ID' },
        { status: 400 }
      );
    }
    
    // Находим категорию
    const category = await Category.findById(id);
    
    if (!category) {
      console.log('[CATEGORY SUBCATEGORY DELETE] Category not found:', id);
      return NextResponse.json(
        { success: false, error: 'Категория не найдена' },
        { status: 404 }
      );
    }
    
    // Находим индекс подкатегории в массиве
    const subcategoryIndex = category.subcategories.findIndex(
      (sc: any) => sc._id.toString() === subcategoryId
    );
    
    if (subcategoryIndex === -1) {
      console.log('[CATEGORY SUBCATEGORY DELETE] Subcategory not found in category:', subcategoryId);
      return NextResponse.json(
        { success: false, error: 'Подкатегория не найдена' },
        { status: 404 }
      );
    }
    
    // Step 1: Удаляем подкатегорию из коллекции Subcategory
    const deletedSubcategory = await mongoose.model('Subcategory').deleteOne(
      { _id: new mongoose.Types.ObjectId(subcategoryId) }
    );
    
    if (deletedSubcategory.deletedCount === 0) {
      console.error('[CATEGORY SUBCATEGORY DELETE] Failed to delete subcategory from collection');
      return NextResponse.json(
        { success: false, error: 'Не удалось удалить подкатегорию из коллекции' },
        { status: 500 }
      );
    }
    console.log('[CATEGORY SUBCATEGORY DELETE] ✅ Subcategory deleted from collection');
    
    // Step 2: Удаляем подкатегорию из массива категории
    category.subcategories.splice(subcategoryIndex, 1);
    const savedCategory = await category.save();
    
    if (!savedCategory) {
      console.error('[CATEGORY SUBCATEGORY DELETE] Failed to update category');
      return NextResponse.json(
        { success: false, error: 'Не удалось обновить категорию' },
        { status: 500 }
      );
    }
    console.log('[CATEGORY SUBCATEGORY DELETE] ✅ Category updated successfully');
    
    // Инвалидируем кэш
    console.log('[CATEGORY SUBCATEGORY DELETE] Invalidating caches...');
    revalidatePath('/admin/categories');
    invalidateCategoriesCache();
    invalidateSubcategoriesCache();
    console.log('[CATEGORY SUBCATEGORY DELETE] ✅ Caches invalidated');
    
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
    
  } catch (error: unknown) {
    console.error(`[CATEGORY SUBCATEGORY DELETE] ❌ Error deleting subcategory ${params.subcategoryId}:`, error);
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