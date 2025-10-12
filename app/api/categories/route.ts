export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import slugify from 'slugify';
import mongoose from 'mongoose';
import connect from '@/lib/db';
import Category from '@/models/Category';
import Subcategory from '@/models/Subcategory';
import { invalidateCategoriesCache } from '@/lib/cache';

// GET all categories with their subcategories
export async function GET(request: NextRequest) {
  try {
    await connect();

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    console.log('[API] GET /api/categories - Загрузка категорий и подкатегорий');

    // Получаем все категории и подкатегории параллельно
    const [categories, allSubcategories] = await Promise.all([
      Category.find(slug ? { slug } : {}).lean(),
      Subcategory.find({}).lean(),
    ]);

    console.log('[API] Загружено категорий:', categories.length);
    console.log('[API] Загружено подкатегорий:', allSubcategories.length);

    // Группируем подкатегории по categoryId для быстрого доступа
    const subcategoriesByCategory = allSubcategories.reduce((acc, sub) => {
      const categoryId = sub.categoryId.toString();
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(sub);
      return acc;
    }, {});

    console.log('[API] Сгруппированы подкатегории по категориям');

    // Наполняем категории их подкатегориями
    const populatedCategories = categories.map((category) => {
      const categoryId = category._id.toString();
      console.log('[API] Обработка категории:', category.name, 'ID:', categoryId);
      
      // Получаем подкатегории для текущей категории
      const categorySubcategories = subcategoriesByCategory[categoryId] || [];
      console.log('[API] Найдено подкатегорий для категории:', categorySubcategories.length);
      
      return {
        ...category,
        subcategories: categorySubcategories,
      };
    });

    // Если искали по slug, возвращаем один объект, иначе массив
    if (slug) {
      if (populatedCategories.length === 0) {
        return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
      }
      return NextResponse.json(populatedCategories[0]);
    }

    return NextResponse.json(populatedCategories);

  } catch (error: unknown) {
    console.error('Ошибка в API категорий:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST a new category
export async function POST(request: NextRequest) {
  console.log('POST /api/categories called');
  try {
    await connect();
    console.log('Connected to DB');
    const body = await request.json();
    console.log('Request body:', body);
    const { name } = body;
    console.log('Category name:', name);
    if (!name) {
      console.log('No name provided');
      return NextResponse.json({ error: 'Название категории обязательно' }, { status: 400 });
    }
    
    // Сначала проверяем существование категории с таким именем
    const existingByName = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    
    if (existingByName) {
      return NextResponse.json({ 
        error: 'Категория с таким названием уже существует',
        existingCategory: {
          id: existingByName._id,
          name: existingByName.name,
          slug: existingByName.slug
        }
      }, { status: 400 });
    }
    
    // Генерируем уникальный slug
    const baseSlug = slugify(name, { lower: true, strict: true }) || `category-${Date.now()}`;
    let slug = baseSlug;
    let counter = 1;
    
    // Находим уникальный slug
    while (await Category.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }
    
    console.log('Generated unique slug:', slug);
    
    // Улучшенная логика генерации ID
    const lastCategory = await Category.findOne().sort({ id: -1 }).lean();
    const newId = lastCategory && typeof lastCategory.id === 'number' ? lastCategory.id + 1 : 1;

    console.log(`Generated new ID: ${newId}`);

    const newCategory = new Category({
      id: newId,
      name: name.trim(),
      slug: slug, // Используем уже сгенерированный уникальный slug
      subcategories: []
    });
    
    let savedCategory;
    try {
      savedCategory = await newCategory.save();
      // Инвалидируем кэш категорий
      invalidateCategoriesCache();
    } catch (err: any) {
      if (err && err.code === 11000) {
        // Обработка ошибки дублирования
        const key = Object.keys(err.keyValue)[0];
        const value = err.keyValue[key];
        return NextResponse.json(
          { error: `Поле \"${key}\" со значением \"${value}\" уже существует.` },
          { status: 409 } // 409 Conflict
        );
      } else {
        // Другие ошибки при сохранении
        throw err;
      }
    }
    console.log('New category saved:', newCategory);
    // TODO: trigger ISR invalidation if needed
    return NextResponse.json(savedCategory, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    // Обрабатываем дубликаты по уникальным полям
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 11000) {
      return NextResponse.json({ error: 'Категория с таким названием или URL-адресом уже существует' }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT to update a category
export async function PUT(request: NextRequest) {
    try {
        await connect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const body = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 });
        }

        const updatedCategory = await Category.findByIdAndUpdate(id, body, { new: true, runValidators: true });

        if (!updatedCategory) {
            return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
        }

        // Инвалидируем кэш категорий
        invalidateCategoriesCache();

        return NextResponse.json(updatedCategory);
    } catch (error: unknown) {
        console.error('Error updating category:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ошибка сервера';
        return NextResponse.json(
            { 
                success: false,
                error: 'Ошибка при обновлении категории',
                details: errorMessage
            }, 
            { status: 500 }
        );
    }
}

// DELETE a category - redirect to specific endpoint
export async function DELETE(request: NextRequest) {
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
}
