'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import { getCachedCategories, invalidateCategoriesCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';

// Создание новой категории
export async function createCategory(formData: FormData) {
  try {
    await dbConnect();
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as string;
    const isActive = formData.get('isActive') === 'true';
    
    if (!name) {
      return {
        success: false,
        error: 'Название категории обязательно'
      };
    }
    
    const category = await Category.create({
      name,
      description,
      image,
      isActive
    });
    
    // Инвалидируем кэш и обновляем страницы
    invalidateCategoriesCache();
    revalidatePath('/admin/categories');
    revalidatePath('/');
    
    return {
      success: true,
      category
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при создании категории:', error);
    
    if (error.code === 11000) {
      return {
        success: false,
        error: 'Категория с таким названием уже существует'
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
      error: 'Ошибка при создании категории'
    };
  }
}

// Обновление категории
export async function updateCategory(id: string, formData: FormData) {
  try {
    await dbConnect();
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as string;
    const isActive = formData.get('isActive') === 'true';
    
    if (!name) {
      return {
        success: false,
        error: 'Название категории обязательно'
      };
    }
    
    const category = await Category.findByIdAndUpdate(
      id,
      {
        name,
        description,
        image,
        isActive
      },
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return {
        success: false,
        error: 'Категория не найдена'
      };
    }
    
    // Инвалидируем кэш и обновляем страницы
    invalidateCategoriesCache();
    revalidatePath('/admin/categories');
    revalidatePath('/');
    
    return {
      success: true,
      category
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при обновлении категории:', error);
    
    if (error.code === 11000) {
      return {
        success: false,
        error: 'Категория с таким названием уже существует'
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
      error: 'Ошибка при обновлении категории'
    };
  }
}

// Удаление категории
export async function deleteCategory(id: string) {
  try {
    await dbConnect();
    
    const category = await Category.findByIdAndDelete(id);
    
    if (!category) {
      return {
        success: false,
        error: 'Категория не найдена'
      };
    }
    
    // Инвалидируем кэш и обновляем страницы
    invalidateCategoriesCache();
    revalidatePath('/admin/categories');
    revalidatePath('/');
    
    return {
      success: true,
      message: 'Категория успешно удалена'
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при удалении категории:', error);
    return {
      success: false,
      error: 'Ошибка при удалении категории'
    };
  }
}

// Получение всех категорий (с кэшированием)
export async function getCategories() {
  try {
    // Получаем категории из кэша
    const categories = await getCachedCategories();
    
    return {
      success: true,
      categories
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при получении категорий:', error);
    return {
      success: false,
      error: 'Ошибка при получении категорий'
    };
  }
}

// Получение активных категорий (с кэшированием)
export async function getActiveCategories() {
  try {
    // Получаем категории из кэша и фильтруем активные
    const categories = await getCachedCategories();
    const activeCategories = categories.filter(cat => cat.isActive);
    
    return {
      success: true,
      categories: activeCategories
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при получении активных категорий:', error);
    return {
      success: false,
      error: 'Ошибка при получении категорий'
    };
  }
} 