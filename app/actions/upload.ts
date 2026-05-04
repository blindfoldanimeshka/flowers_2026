'use server';

import { revalidatePath } from 'next/cache';
import { productionLogger } from '@/lib/productionLogger';

// Загрузка изображения
export async function uploadImage(formData: FormData) {
  try {
    const file = formData.get('image') as File;
    
    if (!file) {
      return {
        success: false,
        error: 'Файл не выбран'
      };
    }

    // Валидация типа файла
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Неподдерживаемый тип файла. Разрешены: JPEG, PNG, WebP'
      };
    }

    // Валидация размера файла (максимум 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'Размер файла превышает 5MB'
      };
    }

    // Отправляем файл на API
    const uploadFormData = new FormData();
    uploadFormData.append('image', file);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`, {
      method: 'POST',
      body: uploadFormData,
      // В реальном проекте нужно передавать токен аутентификации
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Ошибка при загрузке файла'
      };
    }

    const result = await response.json();

    revalidatePath('/admin/products');
    
    return {
      success: true,
      url: result.url,
      fileName: result.fileName || result.filename
    };

  } catch (error: any) {
    productionLogger.error('Ошибка при загрузке изображения:', error);
    return {
      success: false,
      error: 'Ошибка при загрузке изображения'
    };
  }
}

// Получение списка загруженных изображений
export async function getUploadedImages() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`, {
      method: 'GET',
      // В реальном проекте нужно передавать токен аутентификации
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Ошибка при получении списка изображений'
      };
    }

    const result = await response.json();

    return {
      success: true,
      files: result.files || []
    };

  } catch (error: any) {
    productionLogger.error('Ошибка при получении списка изображений:', error);
    return {
      success: false,
      error: 'Ошибка при получении списка изображений'
    };
  }
} 
