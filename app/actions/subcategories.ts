export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { invalidateSubcategoriesCache } from '@/lib/cache';
import { invalidateCategoriesCache } from '@/lib/cache';
import { productionLogger } from '@/lib/productionLogger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Создание новой подкатегории
export async function createSubcategory(formData: FormData) {
  try {
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
    const { data: category, error: catError } = await supabase
      .from('documents')
      .select('id, doc')
      .eq('collection', 2)
      .eq('id', categoryId)
      .maybeSingle();
    
    if (catError || !category) {
      productionLogger.error('Supabase category fetch error:', catError);
      return {
        success: false,
        error: 'Категория не найдена'
      };
    }
    
    const categoryDoc = JSON.parse(category.doc);
    
    // Создаем подкатегорию
    const { data: subcategory, error: subError } = await supabase
      .from('documents')
      .insert({
        collection: 3, // subcategories = 3
        doc: JSON.stringify({
          name,
          slug,
          categoryId,
          categoryNumId: categoryDoc.categoryNumId,
          description,
          image,
          isActive
        })
      })
      .select()
      .single();
    
    if (subError || !subcategory) {
      productionLogger.error('Supabase subcategory create error:', subError);
      if (subError?.code === '23505') { // unique violation
        return {
          success: false,
          error: 'Подкатегория с таким slug уже существует'
        };
      }
      return {
        success: false,
        error: 'Ошибка при создании подкатегории'
      };
    }
    
    // Обновляем категорию, добавляя ID подкатегории в массив
    const currentDoc = JSON.parse(category.doc);
    const updatedSubcategories = [...(currentDoc.subcategories || []), {
      name,
      slug,
      categoryNumId: categoryDoc.categoryNumId,
      isActive
    }];
    
    await supabase
      .from('documents')
      .update({ doc: JSON.stringify({ ...currentDoc, subcategories: updatedSubcategories }) })
      .eq('id', categoryId);
    
    // Инвалидируем кэш и обновляем страницы
    invalidateSubcategoriesCache();
    invalidateCategoriesCache();
    revalidatePath('/admin/subcategories');
    revalidatePath('/admin/categories');
    
    return {
      success: true,
      subcategory: JSON.parse(subcategory.doc)
    };
    
  } catch (error: any) {
    productionLogger.error('Ошибка при создании подкатегории:', error);
    return {
      success: false,
      error: 'Ошибка при создании подкатегории'
    };
  }
}

// Обновление подкатегории
export async function updateSubcategory(id: string, formData: FormData) {
  try {
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
    const { data: currentSub, error: currentError } = await supabase
      .from('documents')
      .select('id, doc')
      .eq('collection', 3)
      .eq('id', id)
      .single();

    if (currentError || !currentSub) {
      productionLogger.error('Supabase subcategory fetch error:', currentError);
      return {
        success: false,
        error: 'Подкатегория не найдена'
      };
    }

    const currentDoc = JSON.parse(currentSub.doc);

    // Если изменилась категория, обновляем связи
    if (currentDoc.categoryId !== categoryId) {
      // Получаем новую категорию для числового ID
      const { data: newCat, error: newCatError } = await supabase
        .from('documents')
        .select('id, doc')
        .eq('collection', 2)
        .eq('id', categoryId)
        .single();

      if (newCatError || !newCat) {
        productionLogger.error('Supabase new category fetch error:', newCatError);
        return {
          success: false,
          error: 'Новая категория не найдена'
        };
      }

      const newCatDoc = JSON.parse(newCat.doc);

      // Обновляем подкатегорию с новым числовым ID категории
      const { data: updatedSub, error: updateError } = await supabase
        .from('documents')
        .update({
          doc: JSON.stringify({
            name,
            slug,
            categoryId,
            categoryNumId: newCatDoc.categoryNumId,
            description,
            image,
            isActive
          })
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError || !updatedSub) {
        productionLogger.error('Supabase subcategory update error:', updateError);
        return {
          success: false,
          error: 'Ошибка при обновлении подкатегории'
        };
      }

      // Обновляем старую категорию - удаляем подкатегорию из массива
      const { data: oldCat, error: oldCatError } = await supabase
        .from('documents')
        .select('id, doc')
        .eq('collection', 2)
        .eq('id', currentDoc.categoryId)
        .single();

      if (!oldCatError && oldCat) {
        const oldCatDoc = JSON.parse(oldCat.doc);
        const updatedOldSubcategories = (oldCatDoc.subcategories || [])
          .filter((s: any) => s.slug !== currentDoc.slug);

        await supabase
          .from('documents')
          .update({ doc: JSON.stringify({ ...oldCatDoc, subcategories: updatedOldSubcategories }) })
          .eq('id', currentDoc.categoryId);
      }

      // Обновляем новую категорию - добавляем подкатегорию в массив
      const updatedNewSubcategories = [...(newCatDoc.subcategories || []), {
        name,
        slug,
        categoryNumId: newCatDoc.categoryNumId,
        isActive
      }];

      await supabase
        .from('documents')
        .update({ doc: JSON.stringify({ ...newCatDoc, subcategories: updatedNewSubcategories }) })
        .eq('id', categoryId);

      // Инвалидируем кэш и обновляем страницы
      invalidateSubcategoriesCache();
      invalidateCategoriesCache();
      revalidatePath('/admin/subcategories');
      revalidatePath('/admin/categories');

      return {
        success: true,
        subcategory: JSON.parse(updatedSub.doc)
      };

    } else {
      // Если категория не изменилась, просто обновляем подкатегорию
      const { data: updatedSub, error: updateError } = await supabase
        .from('documents')
        .update({
          doc: JSON.stringify({
            ...currentDoc,
            name,
            slug,
            description,
            image,
            isActive
          })
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError || !updatedSub) {
        productionLogger.error('Supabase subcategory update error:', updateError);
        return {
          success: false,
          error: 'Ошибка при обновлении подкатегории'
        };
      }

      // Инвалидируем кэш и обновляем страницы
      invalidateSubcategoriesCache();
      revalidatePath('/admin/subcategories');
      revalidatePath('/admin/categories');

      return {
        success: true,
        subcategory: JSON.parse(updatedSub.doc)
      };
    }

  } catch (error: any) {
    productionLogger.error('Ошибка при обновлении подкатегории:', error);

    if (error.code === '23505') { // unique violation in Supabase
      return {
        success: false,
        error: 'Подкатегория с таким slug уже существует'
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
    // Получаем подкатегорию перед удалением
    const { data: sub, error: subError } = await supabase
      .from('documents')
      .select('id, doc')
      .eq('collection', 3)
      .eq('id', id)
      .single();

    if (subError || !sub) {
      productionLogger.error('Supabase subcategory fetch error:', subError);
      return {
        success: false,
        error: 'Подкатегория не найдена'
      };
    }

    const subDoc = JSON.parse(sub.doc);

    // Удаляем подкатегорию
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      productionLogger.error('Supabase subcategory delete error:', deleteError);
      return {
        success: false,
        error: 'Ошибка при удалении подкатегории'
      };
    }

    // Обновляем категорию - удаляем подкатегорию из массива
    if (subDoc.categoryId) {
      const { data: cat, error: catError } = await supabase
        .from('documents')
        .select('id, doc')
        .eq('collection', 2)
        .eq('id', subDoc.categoryId)
        .single();

      if (!catError && cat) {
        const catDoc = JSON.parse(cat.doc);
        const updatedSubcategories = (catDoc.subcategories || [])
          .filter((s: any) => s.slug !== subDoc.slug);

        await supabase
          .from('documents')
          .update({ doc: JSON.stringify({ ...catDoc, subcategories: updatedSubcategories }) })
          .eq('id', subDoc.categoryId);
      }
    }

    // Инвалидируем кэш и обновляем страницы
    invalidateSubcategoriesCache();
    invalidateCategoriesCache();
    revalidatePath('/admin/subcategories');
    revalidatePath('/admin/categories');

    return {
      success: true,
      message: 'Подкатегория успешно удалена'
    };

  } catch (error: any) {
    productionLogger.error('Ошибка при удалении подкатегории:', error);
    return {
      success: false,
      error: 'Ошибка при удалении подкатегории'
    };
  }
}

// Получение всех подкатегорий
export async function getSubcategories(filters?: {
  categoryId?: string;
  isActive?: boolean;
}) {
  try {
    let query = supabase
      .from('documents')
      .select('id, doc')
      .eq('collection', 3)
      .order('doc->>name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      productionLogger.error('Supabase subcategories fetch error:', error);
      return {
        success: false,
        error: 'Ошибка при получении подкатегорий'
      };
    }

    let subcategories = data?.map(row => ({
      _id: row.id,
      ...JSON.parse(row.doc),
    })) || [];

    // Применяем фильтры
    if (filters?.categoryId) {
      subcategories = subcategories.filter(s => s.categoryId === filters.categoryId);
    }
    if (filters?.isActive !== undefined) {
      subcategories = subcategories.filter(s => s.isActive === filters.isActive);
    }

    return {
      success: true,
      subcategories
    };

  } catch (error: any) {
    productionLogger.error('Ошибка при получении подкатегорий:', error);
    return {
      success: false,
      error: 'Ошибка при получении подкатегорий'
    };
  }
}

// Получение подкатегорий по ID категории
export async function getSubcategoriesByCategory(categoryId: string) {
  try {
    if (!categoryId) {
      return {
        success: false,
        error: 'ID категории обязателен'
      };
    }

    const { data, error } = await supabase
      .from('documents')
      .select('id, doc')
      .eq('collection', 3)
      .order('doc->>name', { ascending: true });

    if (error) {
      productionLogger.error('Supabase subcategories fetch error:', error);
      return {
        success: false,
        error: 'Ошибка при получении подкатегорий'
      };
    }

    const subcategories = (data || [])
      .map(row => ({
        _id: row.id,
        ...JSON.parse(row.doc),
      }))
      .filter(s => s.categoryId === categoryId);

    return {
      success: true,
      subcategories
    };

  } catch (error: any) {
    productionLogger.error('Ошибка при получении подкатегорий категории:', error);
    return {
      success: false,
      error: 'Ошибка при получении подкатегорий'
    };
  }
}

// Получение подкатегорий по числовому ID категории
export async function getSubcategoriesByCategoryNumId(categoryNumId: number) {
  try {
    if (categoryNumId === undefined) {
      return {
        success: false,
        error: 'Числовой ID категории обязателен'
      };
    }

    const { data, error } = await supabase
      .from('documents')
      .select('id, doc')
      .eq('collection', 3)
      .order('doc->>name', { ascending: true });

    if (error) {
      productionLogger.error('Supabase subcategories fetch error:', error);
      return {
        success: false,
        error: 'Ошибка при получении подкатегорий'
      };
    }

    const subcategories = (data || [])
      .map(row => ({
        _id: row.id,
        ...JSON.parse(row.doc),
      }))
      .filter(s => s.categoryNumId === categoryNumId);

    return {
      success: true,
      subcategories
    };

  } catch (error: any) {
    productionLogger.error('Ошибка при получении подкатегорий по числовому ID категории:', error);
    return {
      success: false,
      error: 'Ошибка при получении подкатегорий'
    };
  }
} 
