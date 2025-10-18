export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Subcategory from '@/models/Subcategory';
import Category from '@/models/Category'; // Added import for Category
import { getCachedSubcategories, invalidateSubcategoriesCache } from '@/lib/cache';
import { invalidateCategoriesCache } from '@/lib/cache'; // Added import for invalidateCategoriesCache

// Создание новой подкатегории
export async function createSubcategory(formData: FormData) {
  try {
    await dbConnect();
    
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const categoryId = formData.get('categoryId') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as string;
    const isActive = formData.get('isActive') === 'true';
    
    if (!name || !slug || !categoryId) {
      return {
        success: false,
        error: 'Обязательные поля: название, slug, ID категории'
      };
    }
    
    // Получаем категорию, чтобы узнать её числовой ID
    const category = await Category.findById(categoryId);
    if (!category) {
      return {
        success: false,
        error: 'Категория не найдена'
      };
    }
    
    const subcategory = await Subcategory.create({
      name,
      slug,
      categoryId,
      categoryNumId: category.id, // Добавляем числовой ID категории
      description,
      image,
      isActive
    });
    
    // Обновляем категорию, добавляя ID подкатегории в массив
    await Category.findByIdAndUpdate(
      categoryId,
      { $addToSet: { subcategories: subcategory._id } },
      { new: true }
    );
    
    // Инвалидируем кэш и обновляем страницы
    invalidateSubcategoriesCache();
    invalidateCategoriesCache();
    revalidatePath('/admin/subcategories');
    revalidatePath('/admin/categories');
    
    return {
      success: true,
      subcategory
    };
    
  } catch (error: any) {
    console.error('Ошибка при создании подкатегории:', error);
    
    if (error.code === 11000) {
      return {
        success: false,
        error: 'Подкатегория с таким slug уже существует'
      };
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return {
        success: false,
        error: `Ошибка валидации: ${validationErrors.join(', ')}`
      };
    }
    
    return {
      success: false,
      error: 'Ошибка при создании подкатегории'
    };
  }
}

// Обновление подкатегории
export async function updateSubcategory(id: string, formData: FormData) {
  try {
    await dbConnect();
    
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const categoryId = formData.get('categoryId') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as string;
    const isActive = formData.get('isActive') === 'true';
    
    if (!name || !slug || !categoryId) {
      return {
        success: false,
        error: 'Обязательные поля: название, slug, ID категории'
      };
    }
    
    // Получаем текущую подкатегорию
    const currentSubcategory = await Subcategory.findById(id);
    if (!currentSubcategory) {
      return {
        success: false,
        error: 'Подкатегория не найдена'
      };
    }
    
    // Если изменилась категория, обновляем связи
    if (currentSubcategory.categoryId.toString() !== categoryId) {
      // Получаем новую категорию для числового ID
      const newCategory = await Category.findById(categoryId);
      if (!newCategory) {
        return {
          success: false,
          error: 'Новая категория не найдена'
        };
      }
      
      // Удаляем подкатегорию из старой категории
      await Category.findByIdAndUpdate(
        currentSubcategory.categoryId,
        { $pull: { subcategories: id } }
      );
      
      // Добавляем подкатегорию в новую категорию
      await Category.findByIdAndUpdate(
        categoryId,
        { $addToSet: { subcategories: id } }
      );
      
      // Обновляем подкатегорию с новым числовым ID категории
      const subcategory = await Subcategory.findByIdAndUpdate(
        id,
        {
          name,
          slug,
          categoryId,
          categoryNumId: newCategory.id, // Обновляем числовой ID категории
          description,
          image,
          isActive
        },
        { new: true, runValidators: true }
      );
      
      // Инвалидируем кэш и обновляем страницы
      invalidateSubcategoriesCache();
      invalidateCategoriesCache();
      revalidatePath('/admin/subcategories');
      revalidatePath('/admin/categories');
      
      return {
        success: true,
        subcategory
      };
    } else {
      // Если категория не изменилась, просто обновляем подкатегорию
      const subcategory = await Subcategory.findByIdAndUpdate(
        id,
        {
          name,
          slug,
          description,
          image,
          isActive
        },
        { new: true, runValidators: true }
      );
      
      if (!subcategory) {
        return {
          success: false,
          error: 'Подкатегория не найдена'
        };
      }
      
      // Инвалидируем кэш и обновляем страницы
      invalidateSubcategoriesCache();
      revalidatePath('/admin/subcategories');
      revalidatePath('/admin/categories');
      
      return {
        success: true,
        subcategory
      };
    }
    
  } catch (error: any) {
    console.error('Ошибка при обновлении подкатегории:', error);
    
    if (error.code === 11000) {
      return {
        success: false,
        error: 'Подкатегория с таким slug уже существует'
      };
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return {
        success: false,
        error: `Ошибка валидации: ${validationErrors.join(', ')}`
      };
    }
    
    return {
      success: false,
      error: 'Ошибка при обновлении подкатегории'
    };
  }
}

// Удаление подкатегории
export async function deleteSubcategory(id: string) {
  try {
    await dbConnect();
    
    const subcategory = await Subcategory.findByIdAndDelete(id);
    
    if (!subcategory) {
      return {
        success: false,
        error: 'Подкатегория не найдена'
      };
    }
    
    // Инвалидируем кэш и обновляем страницы
    invalidateSubcategoriesCache();
    revalidatePath('/admin/subcategories');
    revalidatePath('/admin/categories');
    
    return {
      success: true,
      message: 'Подкатегория успешно удалена'
    };
    
  } catch (error: any) {
    console.error('Ошибка при удалении подкатегории:', error);
    return {
      success: false,
      error: 'Ошибка при удалении подкатегории'
    };
  }
}

// Получение всех подкатегорий (с кэшированием)
export async function getSubcategories(filters?: {
  categoryId?: string;
  isActive?: boolean;
}) {
  try {
    // Получаем подкатегории из кэша
    const subcategories = await getCachedSubcategories(filters);
    
    return {
      success: true,
      subcategories
    };
    
  } catch (error: any) {
    console.error('Ошибка при получении подкатегорий:', error);
    return {
      success: false,
      error: 'Ошибка при получении подкатегорий'
    };
  }
}

// Получение подкатегорий по ID категории (с кэшированием)
export async function getSubcategoriesByCategory(categoryId: string) {
  try {
    if (!categoryId) {
      return {
        success: false,
        error: 'ID категории обязателен'
      };
    }
    
    // Получаем подкатегории из кэша с фильтром по категории
    const subcategories = await getCachedSubcategories({ categoryId });
    
    return {
      success: true,
      subcategories
    };
    
  } catch (error: any) {
    console.error('Ошибка при получении подкатегорий категории:', error);
    return {
      success: false,
      error: 'Ошибка при получении подкатегорий'
    };
  }
}

// Получение подкатегорий по числовому ID категории (с кэшированием)
export async function getSubcategoriesByCategoryNumId(categoryNumId: number) {
  try {
    if (categoryNumId === undefined) {
      return {
        success: false,
        error: 'Числовой ID категории обязателен'
      };
    }
    
    // Получаем подкатегории из кэша с фильтром по числовому ID категории
    const subcategories = await getCachedSubcategories({ categoryNumId });
    
    return {
      success: true,
      subcategories
    };
    
  } catch (error: any) {
    console.error('Ошибка при получении подкатегорий по числовому ID категории:', error);
    return {
      success: false,
      error: 'Ошибка при получении подкатегорий'
    };
  }
} 