export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
'use server';

import { revalidatePath } from 'next/cache';
import { getCachedProducts, invalidateProductsCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Создание нового товара
export async function createProduct(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const categoryId = formData.get('categoryId') as string;
    const subcategoryId = formData.get('subcategoryId') as string;
    const image = formData.get('image') as string;
    const description = formData.get('description') as string;
    const inStock = formData.get('inStock') === 'true';
    
    if (!name || !price || !categoryId || !image) {
      return {
        success: false,
        error: 'Обязательные поля: название, цена, ID категории, изображение'
      };
    }
    
    if (Number.isNaN(price) || price <= 0) {
      return {
        success: false,
        error: 'Цена должна быть больше нуля'
      };
    }
    
    const productData: any = {
      name,
      price,
      categoryId,
      image,
      description,
      inStock
    };
    
    if (subcategoryId) {
      productData.subcategoryId = subcategoryId;
    }
    
    const { data, error } = await supabase
      .from('documents')
      .insert({ collection: 4, doc: JSON.stringify(productData) })
      .select()
      .single();
    
    if (error) {
      productionLogger.error('Ошибка при создании товара (Supabase):', error);
      return {
        success: false,
        error: 'Ошибка при создании товара'
      };
    }
    
    const product = { id: data.id, ...JSON.parse(data.doc) };
    
    invalidateProductsCache();
    revalidatePath('/admin/products');
    revalidatePath('/');
    
    return {
      success: true,
      product
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при создании товара:', error);
    return {
      success: false,
      error: 'Ошибка при создании товара'
    };
  }
}

// Обновление товара
export async function updateProduct(formData: FormData) {
  try {
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const categoryId = formData.get('categoryId') as string;
    const subcategoryId = formData.get('subcategoryId') as string;
    const image = formData.get('image') as string;
    const description = formData.get('description') as string;
    const inStock = formData.get('inStock') === 'true';
    
    if (!id) {
      return {
        success: false,
        error: 'ID товара обязателен'
      };
    }
    
    if (!name || !name.trim()) {
      return {
        success: false,
        error: 'Название товара обязательно'
      };
    }
    
    if (!image || !image.trim()) {
      return {
        success: false,
        error: 'Изображение товара обязательно'
      };
    }
    
    if (!categoryId || !categoryId.trim()) {
      return {
        success: false,
        error: 'ID категории обязателен'
      };
    }
    
    if (Number.isNaN(price) || price <= 0) {
      return {
        success: false,
        error: 'Цена должна быть больше нуля'
      };
    }
    
    const updateData: any = {
      name,
      price,
      categoryId,
      image,
      description,
      inStock
    };
    
    if (subcategoryId) {
      updateData.subcategoryId = subcategoryId;
    }
    
    const { data, error } = await supabase
      .from('documents')
      .update({ doc: JSON.stringify(updateData) })
      .eq('id', id)
      .eq('collection', 4)
      .select()
      .single();
    
    if (error || !data) {
      productionLogger.error('Ошибка при обновлении товара (Supabase):', error);
      return {
        success: false,
        error: 'Товар не найден'
      };
    }
    
    const product = { id: data.id, ...JSON.parse(data.doc) };
    
    invalidateProductsCache();
    revalidatePath('/admin/products');
    revalidatePath('/');
    
    return {
      success: true,
      product
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при обновлении товара:', error);
    return {
      success: false,
      error: 'Ошибка при обновлении товара'
    };
  }
}

// Удаление товара
export async function deleteProduct(id: string) {
  try {
    if (!id) {
      return {
        success: false,
        error: 'ID товара обязателен'
      };
    }
    
    const { data, error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('collection', 4)
      .select()
      .single();
    
    if (error || !data) {
      productionLogger.error('Ошибка при удалении товара (Supabase):', error);
      return {
        success: false,
        error: 'Товар не найден'
      };
    }
    
    invalidateProductsCache();
    revalidatePath('/admin/products');
    revalidatePath('/');
    
    return {
      success: true,
      message: 'Товар успешно удален'
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при удалении товара:', error);
    return {
      success: false,
      error: 'Ошибка при удалении товара'
    };
  }
}

// Получение товаров с фильтрацией (с кэшированием)
export async function getProducts(filters?: {
  categoryId?: string;
  subcategoryId?: string;
  search?: string;
  inStock?: boolean;
}) {
  try {
    const result = await getCachedProducts(filters);
    
    return {
      success: true,
      ...result
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при получении товаров:', error);
    return {
      success: false,
      error: 'Ошибка при получении товаров'
    };
  }
}