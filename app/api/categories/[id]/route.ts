import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import mongoose from 'mongoose';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connect();
    const { default: Category } = await import('@/models/Category');
    const { default: Subcategory } = await import('@/models/Subcategory');
    const { id } = params;

    const category = await Category.findById(id).lean();
    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    const subcategories = await Subcategory.find({ categoryId: id }).lean();
    return NextResponse.json({ ...category, subcategories }, { status: 200 });
  } catch (error: any) {
    console.error(`Ошибка при получении категории с ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Ошибка при получении категории', details: error.message },
      { status: 500 }
    );
  }
}

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

    invalidateCategoriesCache();
    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    console.error('Ошибка при обновлении категории:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

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

    const url = new URL(request.url);
    const forceDelete = url.searchParams.get('force') === 'true';

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

    if (totalProducts > 0 && !forceDelete) {
      return NextResponse.json({
        error: 'В категории есть товары',
        canForceDelete: true,
        productCount: totalProducts,
        details: {
          productsInCategory,
          productsInSubcategories,
          subcategoriesCount: subcategories.length
        }
      }, { status: 409 });
    }

    if (totalProducts > 0 && forceDelete) {
      await Product.deleteMany({ categoryId: id });
      await Product.deleteMany({ subcategoryId: { $in: subcategoryIds } });
      console.log(`Принудительно удалено товаров: ${totalProducts}`);
    }

    await Subcategory.deleteMany({ categoryId: id });
    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
    }

    invalidateCategoriesCache();
    invalidateSubcategoriesCache();

    const responseMessage = forceDelete
      ? `Категория, ${subcategories.length} подкатегорий и ${totalProducts} товаров успешно удалены`
      : 'Категория и ее подкатегории успешно удалены';

    return NextResponse.json({
      message: responseMessage,
      deletedItems: {
        categories: 1,
        subcategories: subcategories.length,
        products: forceDelete ? totalProducts : 0
      }
    });
  } catch (error: any) {
    console.error('Ошибка при удалении категории:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
