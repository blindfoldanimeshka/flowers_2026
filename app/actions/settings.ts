export const dynamic = 'force-dynamic';

'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { getCachedSettings, invalidateSettingsCache } from '@/lib/cache';

// Получение настроек (с кэшированием)
export async function getSettings() {
  try {
    // Получаем настройки из кэша
    const settings = await getCachedSettings();
    
    return {
      success: true,
      settings
    };
    
  } catch (error: any) {
    console.error('Ошибка при получении настроек:', error);
    return {
      success: false,
      error: 'Ошибка при получении настроек'
    };
  }
}

// Обновление настроек
export async function updateSettings(formData: FormData) {
  try {
    await dbConnect();
    
    // Получаем данные из формы
    const siteName = formData.get('siteName') as string;
    const siteDescription = formData.get('siteDescription') as string;
    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const address = formData.get('address') as string;
    const workingHours = formData.get('workingHours') as string;
    const deliveryRadius = parseFloat(formData.get('deliveryRadius') as string);
    const minOrderAmount = parseFloat(formData.get('minOrderAmount') as string);
    const freeDeliveryThreshold = parseFloat(formData.get('freeDeliveryThreshold') as string);
    const deliveryFee = parseFloat(formData.get('deliveryFee') as string);
    const currency = formData.get('currency') as string;
    const timezone = formData.get('timezone') as string;
    const maintenanceMode = formData.get('maintenanceMode') === 'true';
    const seoTitle = formData.get('seoTitle') as string;
    const seoDescription = formData.get('seoDescription') as string;
    const seoKeywords = formData.get('seoKeywords') as string;
    
    // Социальные сети
    const facebook = formData.get('facebook') as string;
    const instagram = formData.get('instagram') as string;
    const telegram = formData.get('telegram') as string;
    const whatsapp = formData.get('whatsapp') as string;
    
    // Валидация обязательных полей
    if (!siteName || !contactEmail || !contactPhone || !address || !workingHours) {
      return {
        success: false,
        error: 'Обязательные поля: название сайта, email, телефон, адрес, время работы'
      };
    }
    
    // Получаем текущие настройки или создаем новые
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.getSettings();
    }
    
    // Обновляем настройки
    const updateData: any = {
      siteName,
      siteDescription,
      contactEmail,
      contactPhone,
      address,
      workingHours,
      deliveryRadius,
      minOrderAmount,
      freeDeliveryThreshold,
      deliveryFee,
      currency,
      timezone,
      maintenanceMode,
      seoTitle,
      seoDescription,
      seoKeywords,
      socialLinks: {
        facebook,
        instagram,
        telegram,
        whatsapp
      }
    };
    
    const updatedSettings = await Settings.findByIdAndUpdate(
      settings._id,
      updateData,
      { new: true, runValidators: true }
    );
    
    // Инвалидируем кэш и обновляем страницы
    invalidateSettingsCache();
    revalidatePath('/admin/settings');
    revalidatePath('/');
    
    return {
      success: true,
      settings: updatedSettings
    };
    
  } catch (error: any) {
    console.error('Ошибка при обновлении настроек:', error);
    
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
      error: 'Ошибка при обновлении настроек'
    };
  }
}

// Переключение режима обслуживания
export async function toggleMaintenanceMode() {
  try {
    await dbConnect();
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.getSettings();
    }
    
    const updatedSettings = await Settings.findByIdAndUpdate(
      settings._id,
      { maintenanceMode: !settings.maintenanceMode },
      { new: true }
    );
    
    // Инвалидируем кэш и обновляем страницы
    invalidateSettingsCache();
    revalidatePath('/admin/settings');
    revalidatePath('/');
    
    return {
      success: true,
      settings: updatedSettings
    };
    
  } catch (error: any) {
    console.error('Ошибка при переключении режима обслуживания:', error);
    return {
      success: false,
      error: 'Ошибка при переключении режима обслуживания'
    };
  }
} 