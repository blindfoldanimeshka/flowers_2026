'use client';

import { useCallback, useEffect, useState } from 'react';
import { ICategoryWithStats } from '@/app/client/models/Category';
import { createCategory, createSubcategory, deleteCategory, deleteSubcategory, getCategoriesWithStats, updateCategoryName, updateSubcategoryName } from './service';

type Toast = { id: number; message: string; type: 'success' | 'error' };

export function useAdminCategoriesViewModel() {
  const [categories, setCategories] = useState<ICategoryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 3000);
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await getCategoriesWithStats());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при загрузке данных';
      setError(message);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const handleAddCategory = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return showToast('Название категории не может быть пустым', 'error');
    try {
      await createCategory(newCategoryName.trim());
      showToast(`Категория "${newCategoryName.trim()}" успешно создана!`);
      setNewCategoryName('');
      await fetchAllData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при создании категории';
      setError(message);
      showToast(message, 'error');
    }
  }, [fetchAllData, newCategoryName, showToast]);

  const handleAddSubcategory = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcategoryName.trim()) return showToast('Название подкатегории не может быть пустым', 'error');
    if (!selectedCategoryId) return showToast('Выберите категорию для подкатегории', 'error');
    try {
      setLoading(true);
      await createSubcategory(newSubcategoryName.trim(), selectedCategoryId);
      showToast(`Подкатегория "${newSubcategoryName.trim()}" успешно создана!`);
      setNewSubcategoryName('');
      setSelectedCategoryId('');
      await fetchAllData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при создании подкатегории';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchAllData, newSubcategoryName, selectedCategoryId, showToast]);

  const handleUpdate = useCallback(async (type: 'category' | 'subcategory', id: string, name: string) => {
    if (!name.trim()) return showToast('Название не может быть пустым', 'error');
    try {
      setSavingId(id);
      if (type === 'category') await updateCategoryName(id, name.trim());
      else await updateSubcategoryName(id, name.trim());
      showToast(`${type === 'category' ? 'Категория' : 'Подкатегория'} "${name.trim()}" успешно обновлена!`);
      setEditingId(null);
      await fetchAllData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при обновлении';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSavingId(null);
    }
  }, [fetchAllData, showToast]);

  const handleDelete = useCallback(async (type: 'category' | 'subcategory', id: string, name: string, productCount?: number) => {
    const itemType = type === 'category' ? 'категорию' : 'подкатегорию';
    let confirmMessage = `Вы уверены, что хотите удалить ${itemType} "${name}"?`;
    if (productCount && productCount > 0) confirmMessage += `\n\nВнимание: найдено товаров: ${productCount}`;
    if (!window.confirm(confirmMessage)) return;
    try {
      if (type === 'category') await deleteCategory(id);
      else await deleteSubcategory(id);
      showToast(`${type === 'category' ? 'Категория' : 'Подкатегория'} "${name}" успешно удалена!`);
      await fetchAllData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при удалении';
      if (message.includes('товары')) {
        const forceMessage = `${message}\n\nУдалить вместе с товарами?`;
        if (!window.confirm(forceMessage)) {
          setError(message);
          showToast(message, 'error');
          return;
        }
        try {
          if (type === 'category') await deleteCategory(id, true);
          else await deleteSubcategory(id, true);
          showToast(`${type === 'category' ? 'Категория' : 'Подкатегория'} "${name}" успешно удалена!`);
          await fetchAllData();
          return;
        } catch (forceErr) {
          const forceMessageText = forceErr instanceof Error ? forceErr.message : 'Ошибка при принудительном удалении';
          setError(forceMessageText);
          showToast(forceMessageText, 'error');
          return;
        }
      }
      setError(message);
      showToast(message, 'error');
    }
  }, [fetchAllData, showToast]);

  return { categories, loading, error, showDebug, setShowDebug, toasts, newCategoryName, setNewCategoryName, newSubcategoryName, setNewSubcategoryName, selectedCategoryId, setSelectedCategoryId, editingId, setEditingId, savingId, handleAddCategory, handleAddSubcategory, handleUpdate, handleDelete };
}

