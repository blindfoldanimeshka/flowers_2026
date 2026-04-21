import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import { isValidId } from '@/lib/id';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

type CategoryRouteContext = { params: Promise<{ id: string }> };

export const GET = withErrorHandler(async (request: NextRequest, { params }: CategoryRouteContext) => {
    await connect();
    const { default: Category } = await import('@/models/Category');
    const { default: Subcategory } = await import('@/models/Subcategory');
    const { id } = await params;

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
    await connect();
    const { default: Category } = await import('@/models/Category');
    const { id } = await params;
    const { name } = await request.json();

    if (!isValidId(id)) {
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

    invalidateCategoriesCache();
    return NextResponse.json(updatedCategory);
  
});

export const DELETE = withErrorHandler(async (request: Request, { params }: CategoryRouteContext) => {
    await connect();
    const { default: Category } = await import('@/models/Category');
    const { default: Subcategory } = await import('@/models/Subcategory');
    const { default: Product } = await import('@/models/Product');
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json({ error: 'Неверный ID категории' }, { status: 400 });
    }

    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
    }

    const subcategories = await Subcategory.find({ categoryId: id }).select('_id').lean();
    const subcategoryIds = subcategories.map((sub: any) => sub._id);

    // Подсчитываем товары
    const productsInCategory = await Product.countDocuments({ categoryId: id });
    const productsInSubcategories = await Product.countDocuments({
      subcategoryId: { $in: subcategoryIds }
    });
    const totalProducts = productsInCategory + productsInSubcategories;

    // Помечаем все товары категории и подкатегорий как "не в наличии"
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

    // Удаляем подкатегории и категорию
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

