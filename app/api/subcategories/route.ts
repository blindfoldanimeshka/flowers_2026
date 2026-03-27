export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Subcategory from '@/models/Subcategory';
import slugify from 'slugify';
import Category from '@/models/Category';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';
import { isValidId } from '@/lib/id';
import { escapeRegExp, sanitizeMongoObject } from '@/lib/security';

// GET all subcategories
export async function GET(request: NextRequest) {
  try {
    await connect();

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const categoryId = searchParams.get('categoryId');
    const categoryNumId = searchParams.get('categoryNumId');

    const query: Record<string, string | number> = {};
    if (slug) query.slug = slug;
    if (categoryId) query.categoryId = categoryId;
    if (categoryNumId) {
      const parsedCategoryNumId = Number.parseInt(categoryNumId, 10);
      if (!Number.isNaN(parsedCategoryNumId)) {
        query.categoryNumId = parsedCategoryNumId;
      }
    }

    if (slug) {
      const subcategory = await Subcategory.findOne(query).lean();
      if (!subcategory) {
        return NextResponse.json(
          { success: false, error: 'Подкатегория не найдена' },
          { status: 404 }
        );
      }

      return NextResponse.json(subcategory);
    }

    const subcategories = await Subcategory.find(query).lean();
    return NextResponse.json({ success: true, data: subcategories });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[SUBCATEGORY API GET] Error:', errorMessage);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении подкатегорий', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST a new subcategory
export async function POST(request: NextRequest) {
  try {
    await connect();
    
    const body = sanitizeMongoObject(await request.json());
    const { name, categoryId, description, image, isActive } = body;
    
    console.log('[SUBCATEGORY API] Creating subcategory:', { name, categoryId });
    
    if (!name || !categoryId) {
      return NextResponse.json(
        { success: false, error: 'Название и ID категории обязательны' },
        { status: 400 }
      );
    }
    
    if (!isValidId(categoryId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат ID категории' },
        { status: 400 }
      );
    }
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Указанная категория не найдена' },
        { status: 404 }
      );
    }
    
    console.log('[SUBCATEGORY API] Found category:', { 
      _id: String(category._id),
      id: category.id,
      name: category.name, 
      subcategories: Array.isArray(category.subcategories) ? category.subcategories.map((id: any) => String(id)) : 'not an array'
    });
    
    const existingSubcategory = await Subcategory.findOne({
      name: { $regex: new RegExp(`^${escapeRegExp(name.trim())}$`, 'i') },
      categoryId
    });
    
    if (existingSubcategory) {
      return NextResponse.json(
        { success: false, error: 'Подкатегория с таким названием уже существует в этой категории' },
        { status: 409 }
      );
    }
    
    let slug = slugify(name, { lower: true, strict: true });
    let counter = 1;
    while (await Subcategory.exists({ slug })) {
      slug = `${slugify(name, { lower: true, strict: true })}-${counter++}`;
    }
    
    try {
      // Создаем объект подкатегории
      const subcategoryData = {
        name: name.trim(),
        slug,
        categoryId,
        categoryNumId: category.id,
        description: description || '',
        image: image || '',
        isActive: isActive !== undefined ? isActive : true
      };
      
      console.log('[SUBCATEGORY API] Creating subcategory with data:', subcategoryData);
      
      // Создаем новую подкатегорию
      const newSubcategory = new Subcategory(subcategoryData);
      
      // Проверяем валидность модели
      const validationError = newSubcategory.validateSync();
      if (validationError) {
        console.error('[SUBCATEGORY API] Validation error:', validationError);
        return NextResponse.json(
          { success: false, error: 'Ошибка валидации данных', details: validationError.message },
          { status: 400 }
        );
      }
      
      // Сохраняем подкатегорию
      const savedSubcategory = await newSubcategory.save();
      console.log('[SUBCATEGORY API] Saved new subcategory:', {
        _id: savedSubcategory._id.toString(),
        name: savedSubcategory.name,
        categoryId: savedSubcategory.categoryId.toString(),
        categoryNumId: savedSubcategory.categoryNumId
      });
      
      // Обновляем категорию, используя $addToSet для добавления ID подкатегории
      console.log('[SUBCATEGORY API] Updating category with subcategory ID:', savedSubcategory._id.toString());
      
      const updateResult = await Category.findByIdAndUpdate(
        categoryId,
        { $addToSet: { subcategories: savedSubcategory._id } },
        { new: true }
      );
      
      console.log('[SUBCATEGORY API] Category update result:', {
        modifiedCount: updateResult ? 1 : 0,
        subcategories: updateResult ? updateResult.subcategories.map(id => id.toString()) : 'failed'
      });
      
      if (!updateResult) {
        console.error('[SUBCATEGORY API] ❌ Failed to update category!');
        return NextResponse.json(
          { success: false, error: 'Не удалось обновить категорию' },
          { status: 500 }
        );
      }
      
      console.log('[SUBCATEGORY API] ✅ SUCCESS: Category updated successfully with subcategory');
      
      // Оптимизированная инвалидация кэша - только то что нужно
      try {
        console.log('[SUBCATEGORY API] Invalidating cache...');
        
        // Инвалидируем только кэш категорий (подкатегории включены в категории)
        invalidateCategoriesCache();
        console.log('[SUBCATEGORY API] Categories cache invalidated');
        
        // Инвалидируем кэш подкатегорий отдельно для других endpoint'ов
        invalidateSubcategoriesCache();
        console.log('[SUBCATEGORY API] Subcategories cache invalidated');
        
        // Перезагружаем только необходимые пути
        const { revalidatePath } = await import('next/cache');
        revalidatePath('/admin/categories');
        revalidatePath(`/category/${category.slug}`);
        console.log('[SUBCATEGORY API] Essential paths revalidated');
      } catch (cacheError) {
        console.error('[SUBCATEGORY API] Error invalidating cache:', cacheError);
        // Не прерываем выполнение из-за ошибки кэша
      }
      
      console.log('[SUBCATEGORY API] Subcategory created successfully', savedSubcategory);
      
      return NextResponse.json({ success: true, data: savedSubcategory }, { status: 201 });
    } catch (error) {
      console.error('[SUBCATEGORY API] Error during subcategory creation:');
      if (error instanceof Error) {
        console.error('Name:', error.name);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        
        // Проверяем, является ли ошибка ошибкой валидации MongoDB
        if (error.name === 'ValidationError') {
          const validationErrors = Object.values((error as any).errors || {}).map(
            (err: any) => err.message || 'Ошибка валидации'
          );
          return NextResponse.json(
            { success: false, error: 'Ошибка валидации данных', details: validationErrors.join(', ') },
            { status: 400 }
          );
        }
        
        // Проверяем, является ли ошибка ошибкой дублирования
        if ((error as any).code === 11000) {
          return NextResponse.json(
            { success: false, error: 'Дублирование уникального поля', details: error.message },
            { status: 409 }
          );
        }
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[SUBCATEGORY API] Error:', errorMessage);
    console.error('[SUBCATEGORY API] Stack:', error instanceof Error ? error.stack : '');
    
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании подкатегории', details: errorMessage },
      { status: 500 }
    );
  }
}
