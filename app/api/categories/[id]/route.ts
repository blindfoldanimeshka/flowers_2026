import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
// Use dynamic imports to prevent circular dependency issues during build
// Models are loaded lazily inside each handler instead of at module evaluation time.
// TODO: consider cache invalidation if using ISR. Removed revalidateTag to avoid build-time errors.
// import { revalidateTag } from 'next/cache';
import mongoose from 'mongoose';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';

// GET запрос для получения конкретной категории по ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connect();
    const { default: Category } = await import('@/models/Category');
    const { id } = params;
    const category = await Category.findById(id);
    
    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(category, { status: 200 });
  } catch (error: any) {
    console.error(`Ошибка при получении категории с ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Ошибка при получении категории', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a category by ID
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connect();
    const { default: Category } = await import('@/models/Category');
    const { id } = params;
    const { name } = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Неверный ID категории' }, { status: 400 });
    }
    
    if (!name) {
      return NextResponse.json({ error: 'Название категории обязательно' }, { status: 400 });
    }
    
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );
    
    if (!updatedCategory) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
    }

    // Инвалидируем кэш категорий
    invalidateCategoriesCache();
    
    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    console.error('Ошибка при обновлении категории:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE - Delete a category by ID
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await connect();
    const { default: Category } = await import('@/models/Category');
    const { default: Subcategory } = await import('@/models/Subcategory');
    const { default: Product } = await import('@/models/Product');
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Неверный ID категории' }, { status: 400 });
    }
    
    // Получаем query параметры
    const url = new URL(request.url);
    const forceDelete = url.searchParams.get('force') === 'true';
    
    // Подсчитываем товары в категории и её подкатегориях
    const category = await Category.findById(id).populate('subcategories');
    if (!category) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
    }
    
    const subcategoryIds = category.subcategories.map((sub: any) => sub._id);
    const productsInCategory = await Product.countDocuments({ categoryId: id });
    const productsInSubcategories = await Product.countDocuments({ 
      subcategoryId: { $in: subcategoryIds } 
    });
    const totalProducts = productsInCategory + productsInSubcategories;
    
    // Если есть товары и не принудительное удаление, возвращаем информацию
    if (totalProducts > 0 && !forceDelete) {
      return NextResponse.json({ 
        error: 'В категории есть товары',
        canForceDelete: true,
        productCount: totalProducts,
        details: {
          productsInCategory: productsInCategory,
          productsInSubcategories: productsInSubcategories,
          subcategoriesCount: category.subcategories.length
        }
      }, { status: 409 });
    }
    
    // Если принудительное удаление или нет товаров - удаляем всё
    if (totalProducts > 0 && forceDelete) {
      // Удаляем все товары в категории
      await Product.deleteMany({ categoryId: id });
      
      // Удаляем все товары в подкатегориях
      await Product.deleteMany({ subcategoryId: { $in: subcategoryIds } });
      
      console.log(`Принудительно удалено товаров: ${totalProducts}`);
    }
    
    // Удаляем подкатегории
    await Subcategory.deleteMany({ categoryId: id });
    
    // Удаляем саму категорию
    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
    }
    
    // Инвалидируем кэш категорий и подкатегорий
    invalidateCategoriesCache();
    invalidateSubcategoriesCache();
    
    const responseMessage = forceDelete 
      ? `Категория, ${category.subcategories.length} подкатегорий и ${totalProducts} товаров успешно удалены`
      : 'Категория и ее подкатегории успешно удалены';
    
    return NextResponse.json({ 
      message: responseMessage,
      deletedItems: {
        categories: 1,
        subcategories: category.subcategories.length,
        products: forceDelete ? totalProducts : 0
      }
    });
  } catch (error: any) {
    console.error('Ошибка при удалении категории:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}