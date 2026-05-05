export const dynamic = 'force-dynamic';

'use server';

import { revalidatePath } from 'next/cache';
import { getCachedSettings, invalidateSettingsCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SETTINGS_KEY = 'global-settings';

export async function getSettings() {
  try {
    const settings = await getCachedSettings();

    return {
      success: true,
      settings
    };

  } catch (error: any) {
    productionLogger.error('Ошибка при получении настроек:', error);
    return {
      success: false,
      error: 'Ошибка при получении настроек'
    };
  }
}

export async function updateSettings(formData: FormData) {
  try {
    const siteName = formData.get('siteName') as string;
    const siteDescription = formData.get('siteDescription') as string;
    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const address = formData.get('address') as string;
    const workingHours = formData.get('workingHours') as string;

    const deliveryRadiusRaw = parseFloat(formData.get('deliveryRadius') as string);
    const minOrderAmountRaw = parseFloat(formData.get('minOrderAmount') as string);
    const freeDeliveryThresholdRaw = parseFloat(formData.get('freeDeliveryThreshold') as string);
    const deliveryFeeRaw = parseFloat(formData.get('deliveryFee') as string);

    if (isNaN(deliveryRadiusRaw) || deliveryRadiusRaw <= 0) {
      return {
        success: false,
        error: 'Радиус доставки должен быть положительным числом'
      };
    }

    if (isNaN(minOrderAmountRaw) || minOrderAmountRaw <= 0) {
      return {
        success: false,
        error: 'Минимальная сумма заказа должна быть положительным числом'
      };
    }

    if (isNaN(freeDeliveryThresholdRaw) || freeDeliveryThresholdRaw < 0) {
      return {
        success: false,
        error: 'Порог бесплатной доставки должен быть неотрицательным числом'
      };
    }

    if (isNaN(deliveryFeeRaw) || deliveryFeeRaw < 0) {
      return {
        success: false,
        error: 'Стоимость доставки должна быть неотрицательной'
      };
    }

    const deliveryRadius = deliveryRadiusRaw;
    const minOrderAmount = minOrderAmountRaw;
    const freeDeliveryThreshold = freeDeliveryThresholdRaw;
    const deliveryFee = deliveryFeeRaw;
    const currency = formData.get('currency') as string;
    const timezone = formData.get('timezone') as string;
    const maintenanceMode = formData.get('maintenanceMode') === 'true';
    const seoTitle = formData.get('seoTitle') as string;
    const seoDescription = formData.get('seoDescription') as string;
    const seoKeywords = formData.get('seoKeywords') as string;

    const facebook = formData.get('facebook') as string;
    const instagram = formData.get('instagram') as string;
    const telegram = formData.get('telegram') as string;
    const whatsapp = formData.get('whatsapp') as string;

    if (!siteName || !contactEmail || !contactPhone || !address || !workingHours) {
      return {
        success: false,
        error: 'Обязательные поля: название сайта, email, телефон, адрес, время работы'
      };
    }

    const updateDoc = {
      settingKey: SETTINGS_KEY,
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

    // Ищем существующие настройки
    const { data: existing, error: existingError } = await supabase
      .from('documents')
      .select('*')
      .eq('collection', 7)
      .filter('doc->>settingKey', 'eq', SETTINGS_KEY)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      productionLogger.error('Ошибка поиска настроек (Supabase):', existingError);
      return {
        success: false,
        error: 'Ошибка получения настроек'
      };
    }

    let updatedData;
    if (existing) {
      // Обновляем существующий документ
      const { data, error } = await supabase
        .from('documents')
        .update({ doc: JSON.stringify(updateDoc) })
        .eq('id', existing.id)
        .eq('collection', 7)
        .select()
        .single();
      
      if (error || !data) {
        productionLogger.error('Ошибка обновления настроек (Supabase):', error);
        return {
          success: false,
          error: 'Ошибка обновления настроек'
        };
      }
      updatedData = data;
    } else {
      // Создаем новый документ
      const { data, error } = await supabase
        .from('documents')
        .insert({ collection: 7, doc: JSON.stringify(updateDoc) })
        .select()
        .single();
      
      if (error || !data) {
        productionLogger.error('Ошибка создания настроек (Supabase):', error);
        return {
          success: false,
          error: 'Ошибка создания настроек'
        };
      }
      updatedData = data;
    }

    // Удаляем дубликаты
    await supabase
      .from('documents')
      .delete()
      .eq('collection', 7)
      .filter('doc->>settingKey', 'eq', SETTINGS_KEY)
      .neq('id', updatedData.id);

    invalidateSettingsCache();
    revalidatePath('/admin/settings');
    revalidatePath('/');

    return {
      success: true,
      settings: { id: updatedData.id, ...JSON.parse(updatedData.doc) }
    };

  } catch (error: any) {
    productionLogger.error('Ошибка при обновлении настроек:', error);

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

export async function toggleMaintenanceMode() {
  try {
    // Получаем текущие настройки
    const { data: existing, error: existingError } = await supabase
      .from('documents')
      .select('*')
      .eq('collection', 7)
      .filter('doc->>settingKey', 'eq', SETTINGS_KEY)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      productionLogger.error('Ошибка поиска настроек (Supabase):', existingError);
      return {
        success: false,
        error: 'Ошибка получения настроек'
      };
    }

    const currentDoc = existing ? JSON.parse(existing.doc) : {};
    const newMaintenanceMode = !(currentDoc.maintenanceMode ?? false);

    const updateDoc = {
      ...currentDoc,
      settingKey: SETTINGS_KEY,
      maintenanceMode: newMaintenanceMode
    };

    let updatedData;
    if (existing) {
      const { data, error } = await supabase
        .from('documents')
        .update({ doc: JSON.stringify(updateDoc) })
        .eq('id', existing.id)
        .eq('collection', 7)
        .select()
        .single();
      
      if (error || !data) {
        productionLogger.error('Ошибка переключения режима (Supabase):', error);
        return {
          success: false,
          error: 'Ошибка переключения режима обслуживания'
        };
      }
      updatedData = data;
    } else {
      const { data, error } = await supabase
        .from('documents')
        .insert({ collection: 7, doc: JSON.stringify(updateDoc) })
        .select()
        .single();
      
      if (error || !data) {
        productionLogger.error('Ошибка создания настроек (Supabase):', error);
        return {
          success: false,
          error: 'Ошибка создания настроек'
        };
      }
      updatedData = data;
    }

    // Удаляем дубликаты
    await supabase
      .from('documents')
      .delete()
      .eq('collection', 7)
      .filter('doc->>settingKey', 'eq', SETTINGS_KEY)
      .neq('id', updatedData.id);

    invalidateSettingsCache();
    revalidatePath('/admin/settings');
    revalidatePath('/');

    return {
      success: true,
      settings: { id: updatedData.id, ...JSON.parse(updatedData.doc) }
    };

  } catch (error: any) {
    productionLogger.error('Ошибка при переключении режима обслуживания:', error);
    return {
      success: false,
      error: 'Ошибка при переключении режима обслуживания'
    };
  }
}