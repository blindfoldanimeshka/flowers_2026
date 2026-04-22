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
  images: string[];
  categoryId: string; // Оставляем для обратной совместимости
  categoryIds: string[]; // Новое поле - массив категорий
  subcategoryId: string;
  inStock: boolean;
  preorderOnly: boolean;
  assemblyTime: string;
  stockQuantity: number;
  stockUnit: string;
  pinnedInCategory: string; // ID категории, в которой товар закреплен
}

const emptyDraft: AdminProductDraft = {
  name: '',
  description: '',
  price: 0,
  image: '',
  images: [],
  categoryId: '',
  categoryIds: [],
  subcategoryId: '',
  inStock: true,
  preorderOnly: false,
  assemblyTime: '',
  stockQuantity: 0,
  stockUnit: 'шт.',
  pinnedInCategory: '',
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

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
    scrollToTop();
  }, [scrollToTop]);

  const openEditForm = useCallback((product: IProduct) => {
    // Инициализируем categoryIds из product.categoryIds или из categoryId для обратной совместимости
    const categoryIds = product.categoryIds && product.categoryIds.length > 0
      ? product.categoryIds
      : (product.categoryId ? [product.categoryId] : []);

    setDraft({
      _id: product._id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      image: product.image,
      images: Array.from(new Set([...(product.images || []), product.image].filter(Boolean))).slice(0, 3),
      categoryId: product.categoryId ? String(product.categoryId) : (categoryIds[0] || ''),
      categoryIds: categoryIds.map(id => String(id)),
      subcategoryId: product.subcategoryId ? String(product.subcategoryId) : '',
      inStock: product.inStock ?? true,
      preorderOnly: product.preorderOnly ?? false,
      assemblyTime: product.assemblyTime ?? '',
      stockQuantity: Math.max(0, Math.floor(product.stockQuantity ?? 0)),
      stockUnit: product.stockUnit?.trim() || 'шт.',
      pinnedInCategory: product.pinnedInCategory ? String(product.pinnedInCategory) : '',
    });
    setIsFormVisible(true);
    scrollToTop();
  }, [scrollToTop]);

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
    if (!draft.categoryIds || draft.categoryIds.length === 0) return showToast('Выберите хотя бы одну категорию', 'error');
    const images = Array.from(new Set((draft.images || []).map((src) => src?.trim()).filter(Boolean))).slice(0, 3);
    if (images.length === 0) return showToast('Добавьте хотя бы одно изображение товара', 'error');
    if (!Number.isFinite(draft.price) || draft.price <= 0) return showToast('Укажите корректную цену товара', 'error');

    // Проверяем, что pinnedInCategory входит в список выбранных категорий
    if (draft.pinnedInCategory && !draft.categoryIds.includes(draft.pinnedInCategory)) {
      return showToast('Категория для закрепления должна быть выбрана в списке категорий', 'error');
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        price: draft.price,
        image: images[0],
        images,
        categoryId: draft.categoryIds[0], // Первая категория для обратной совместимости
        categoryIds: draft.categoryIds,
        subcategoryId: draft.subcategoryId || undefined,
        inStock: draft.inStock,
        preorderOnly: draft.preorderOnly,
        assemblyTime: draft.assemblyTime.trim(),
        stockQuantity: Math.max(0, Math.floor(draft.stockQuantity)),
        stockUnit: draft.stockUnit.trim() || 'шт.',
        pinnedInCategory: draft.pinnedInCategory || undefined,
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
