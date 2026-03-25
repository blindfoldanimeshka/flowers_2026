import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import { Category } from '@/models/Category';
import Subcategory from '@/models/Subcategory';
import { revalidatePath } from 'next/cache';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';
import { isValidId } from '@/lib/id';

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

    const subcategory = await Subcategory.findOne({ _id: subcategoryId, categoryId: id }).lean();
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string, subcategoryId: string } }
) {
  try {
    await connect();

    const { id, subcategoryId } = params;
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string, subcategoryId: string } }
) {
  try {
    await connect();

    const { id, subcategoryId } = params;
    console.log('[CATEGORY SUBCATEGORY DELETE] Deleting subcategory:', { categoryId: id, subcategoryId });

    if (!isValidId(id) || !isValidId(subcategoryId)) {
      return NextResponse.json(
        { success: false, error: 'Некорректный формат ID' },
        { status: 400 }
      );
    }

    const category = await Category.findById(id);
    if (!category) {
      console.log('[CATEGORY SUBCATEGORY DELETE] Category not found:', id);
      return NextResponse.json(
        { success: false, error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    const subcategory = await Subcategory.findOne({ _id: subcategoryId, categoryId: id });
    if (!subcategory) {
      console.log('[CATEGORY SUBCATEGORY DELETE] Subcategory not found in category:', subcategoryId);
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

    console.log('[CATEGORY SUBCATEGORY DELETE] Subcategory deleted successfully');

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
  } catch (error: unknown) {
    console.error(`[CATEGORY SUBCATEGORY DELETE] Error deleting subcategory ${params.subcategoryId}:`, error);
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
