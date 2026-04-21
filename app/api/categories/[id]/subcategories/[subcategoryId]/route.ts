import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import { Category } from '@/models/Category';
import Subcategory from '@/models/Subcategory';
import { revalidatePath } from 'next/cache';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';
import { isValidId } from '@/lib/id';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string, subcategoryId: string }> }
) => {
    await connect();

    const { id, subcategoryId } = await params;
    const category = await Category.findById(id);

    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    const subcategory = await Subcategory.findOne({ _id: subcategoryId, categoryId: id }).lean();
    if (!subcategory) {
      return NextResponse.json(
        { error: 'Подкатегория не найдена' },
        { status: 404 }
      );
    }

    return NextResponse.json(subcategory, { status: 200 });
  
});

export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string, subcategoryId: string }> }
) => {
    await connect();

    const { id, subcategoryId } = await params;
    const body = await request.json();

    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    const subcategory = await Subcategory.findOne({ _id: subcategoryId, categoryId: id });
    if (!subcategory) {
      return NextResponse.json(
        { error: 'Подкатегория не найдена' },
        { status: 404 }
      );
    }

    Object.assign(subcategory, body);
    await subcategory.save();

    invalidateCategoriesCache();
    invalidateSubcategoriesCache();
    revalidatePath('/admin/categories');

    return NextResponse.json(subcategory, { status: 200 });
  
});

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string, subcategoryId: string }> }
) => {
    await connect();

    const { id, subcategoryId } = await params;
    productionLogger.info('[CATEGORY SUBCATEGORY DELETE] Deleting subcategory:', { categoryId: id, subcategoryId });

    if (!isValidId(id) || !isValidId(subcategoryId)) {
      return NextResponse.json(
        { success: false, error: 'Некорректный формат ID' },
        { status: 400 }
      );
    }

    const category = await Category.findById(id);
    if (!category) {
      productionLogger.info('[CATEGORY SUBCATEGORY DELETE] Category not found:', id);
      return NextResponse.json(
        { success: false, error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    const subcategory = await Subcategory.findOne({ _id: subcategoryId, categoryId: id });
    if (!subcategory) {
      productionLogger.info('[CATEGORY SUBCATEGORY DELETE] Subcategory not found in category:', subcategoryId);
      return NextResponse.json(
        { success: false, error: 'Подкатегория не найдена' },
        { status: 404 }
      );
    }

    await Subcategory.deleteOne({ _id: subcategoryId });
    await Category.updateOne(
      { _id: id },
      { $pull: { subcategories: subcategoryId } }
    );

    productionLogger.info('[CATEGORY SUBCATEGORY DELETE] Subcategory deleted successfully');

    revalidatePath('/admin/categories');
    invalidateCategoriesCache();
    invalidateSubcategoriesCache();

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
  
});

