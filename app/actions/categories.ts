'use server';

import { revalidatePath } from 'next/cache';
import { getCachedCategories, invalidateCategoriesCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Создание новой категории
export async function createCategory(formData: FormData) {
  try {
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
    
    const newDoc = { name, description, image, isActive };
    
    const { data, error } = await supabase
      .from('documents')
      .insert({ collection: 2, doc: JSON.stringify(newDoc) })
      .select()
      .single();
    
    if (error) {
      productionLogger.error('Ошибка при создании категории (Supabase):', error);
      return {
        success: false,
        error: 'Ошибка при создании категории'
      };
    }
    
    const category = { id: data.id, ...JSON.parse(data.doc) };
    
    invalidateCategoriesCache();
    revalidatePath('/admin/categories');
    revalidatePath('/');
    
    return {
      success: true,
      category
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при создании категории:', error);
    return {
      success: false,
      error: 'Ошибка при создании категории'
    };
  }
}

// Обновление категории
export async function updateCategory(id: string, formData: FormData) {
  try {
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
    
    const updateDoc = { name, description, image, isActive };
    
    const { data, error } = await supabase
      .from('documents')
      .update({ doc: JSON.stringify(updateDoc) })
      .eq('id', id)
      .eq('collection', 2)
      .select()
      .single();
    
    if (error || !data) {
      productionLogger.error('Ошибка при обновлении категории (Supabase):', error);
      return {
        success: false,
        error: 'Категория не найдена'
      };
    }
    
    const category = { id: data.id, ...JSON.parse(data.doc) };
    
    invalidateCategoriesCache();
    revalidatePath('/admin/categories');
    revalidatePath('/');
    
    return {
      success: true,
      category
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при обновлении категории:', error);
    return {
      success: false,
      error: 'Ошибка при обновлении категории'
    };
  }
}

// Удаление категории
export async function deleteCategory(id: string) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('collection', 2)
      .select()
      .single();
    
    if (error || !data) {
      productionLogger.error('Ошибка при удалении категории (Supabase):', error);
      return {
        success: false,
        error: 'Категория не найдена'
      };
    }
    
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