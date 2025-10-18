export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import { getCachedProducts, invalidateProductsCache } from '@/lib/cache';

// Создание нового товара
export async function createProduct(formData: FormData) {
  try {
    await dbConnect();
    
    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const categoryId = formData.get('categoryId') as string;
    const subcategoryId = formData.get('subcategoryId') as string;
    const image = formData.get('image') as string;
    const description = formData.get('description') as string;
    const inStock = formData.get('inStock') === 'true';
    
    // Валидация
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
    
    const product = await Product.create(productData);
    
    // Инвалидируем кэш и обновляем страницы
    invalidateProductsCache();
    revalidatePath('/admin/products');
    revalidatePath('/');
    
    return {
      success: true,
      product
    };
    
  } catch (error: any) {
    console.error('Ошибка при создании товара:', error);
    
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
      error: 'Ошибка при создании товара'
    };
  }
}

// Обновление товара
export async function updateProduct(formData: FormData) {
  try {
    await dbConnect();
    
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
    
    // Валидация обязательных полей (как в createProduct)
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
    
    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return {
        success: false,
        error: 'Товар не найден'
      };
    }
    
    // Инвалидируем кэш и обновляем страницы
    invalidateProductsCache();
    revalidatePath('/admin/products');
    revalidatePath('/');
    
    return {
      success: true,
      product
    };
    
  } catch (error: any) {
    console.error('Ошибка при обновлении товара:', error);
    
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
      error: 'Ошибка при обновлении товара'
    };
  }
}

// Удаление товара
export async function deleteProduct(id: string) {
  try {
    await dbConnect();
    
    if (!id) {
      return {
        success: false,
        error: 'ID товара обязателен'
      };
    }
    
    const product = await Product.findByIdAndDelete(id);
    
    if (!product) {
      return {
        success: false,
        error: 'Товар не найден'
      };
    }
    
    // Инвалидируем кэш и обновляем страницы
    invalidateProductsCache();
    revalidatePath('/admin/products');
    revalidatePath('/');
    
    return {
      success: true,
      message: 'Товар успешно удален'
    };
    
  } catch (error: any) {
    console.error('Ошибка при удалении товара:', error);
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
    // Получаем товары из кэша
    const result = await getCachedProducts(filters);
    
    return {
      success: true,
      ...result
    };
    
  } catch (error: any) {
    console.error('Ошибка при получении товаров:', error);
    return {
      success: false,
      error: 'Ошибка при получении товаров'
    };
  }
} 