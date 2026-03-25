'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ICategory, ISubcategory } from '@/app/client/models/Category';
import { IProduct } from '@/app/client/models/Product';
import { createProduct, deleteProduct, getAllCategories, getAllProducts, updateProduct } from './service';

type Toast = { id: number; message: string; type: 'success' | 'error' };

export interface AdminProductDraft {
  _id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  subcategoryId: string;
  inStock: boolean;
}

const emptyDraft: AdminProductDraft = {
  name: '',
  description: '',
  price: 0,
  image: '',
  categoryId: '',
  subcategoryId: '',
  inStock: true,
};

export function useAdminProductsViewModel() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [draft, setDraft] = useState<AdminProductDraft>(emptyDraft);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 3000);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextProducts, nextCategories] = await Promise.all([getAllProducts(), getAllCategories()]);
      setProducts(nextProducts);
      setCategories(nextCategories);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить данные';
      setError(message);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const currentSubcategories = useMemo<ISubcategory[]>(() => {
    if (!draft.categoryId) return [];
    return categories.find(category => String(category._id) === String(draft.categoryId))?.subcategories || [];
  }, [categories, draft.categoryId]);

  const openCreateForm = useCallback(() => {
    setDraft(emptyDraft);
    setIsFormVisible(true);
  }, []);

  const openEditForm = useCallback((product: IProduct) => {
    setDraft({
      _id: product._id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      image: product.image,
      categoryId: product.categoryId ? String(product.categoryId) : '',
      subcategoryId: product.subcategoryId ? String(product.subcategoryId) : '',
      inStock: product.inStock ?? true,
    });
    setIsFormVisible(true);
  }, []);

  const closeForm = useCallback(() => {
    setDraft(emptyDraft);
    setIsFormVisible(false);
  }, []);

  const updateDraft = useCallback(<K extends keyof AdminProductDraft>(field: K, value: AdminProductDraft[K]) => {
    setDraft(prev => field === 'categoryId'
      ? { ...prev, categoryId: value as string, subcategoryId: '' }
      : { ...prev, [field]: value });
  }, []);

  const saveDraft = useCallback(async () => {
    if (!draft.name.trim()) return showToast('Название товара обязательно', 'error');
    if (!draft.categoryId) return showToast('Выберите категорию', 'error');
    if (!draft.image) return showToast('Добавьте изображение товара', 'error');
    if (!Number.isFinite(draft.price) || draft.price <= 0) return showToast('Укажите корректную цену товара', 'error');
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        price: draft.price,
        image: draft.image,
        categoryId: draft.categoryId,
        subcategoryId: draft.subcategoryId || undefined,
        inStock: draft.inStock,
      };
      if (draft._id) {
        await updateProduct(draft._id, payload);
        showToast(`Товар "${payload.name}" обновлен`);
      } else {
        await createProduct(payload);
        showToast(`Товар "${payload.name}" создан`);
      }
      closeForm();
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить товар';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }, [closeForm, draft, loadData, showToast]);

  const removeProduct = useCallback(async (product: IProduct) => {
    if (!window.confirm(`Удалить товар "${product.name}"?`)) return;
    try {
      await deleteProduct(product._id);
      showToast(`Товар "${product.name}" удален`);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось удалить товар';
      setError(message);
      showToast(message, 'error');
    }
  }, [loadData, showToast]);

  return {
    products,
    categories,
    currentSubcategories,
    loading,
    saving,
    error,
    toasts,
    isFormVisible,
    draft,
    openCreateForm,
    openEditForm,
    closeForm,
    updateDraft,
    saveDraft,
    removeProduct,
  };
}
