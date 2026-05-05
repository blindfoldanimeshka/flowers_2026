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

  const getCategoryKey = useCallback((category: ICategory): string => {
    return String((category as any)._id ?? (category as any).id ?? '');
  }, []);

  const isFlowersCategory = useCallback((category: ICategory): boolean => {
    const slug = String((category as any).slug ?? '').trim().toLowerCase();
    const name = String((category as any).name ?? '').trim().toLowerCase();
    return slug === 'cvety' || slug === 'flowers' || name === 'цветы';
  }, []);

  const flowersCategoryId = useMemo(() => {
    const flowersCategory = categories.find((category) => isFlowersCategory(category));
    return flowersCategory ? getCategoryKey(flowersCategory) : '';
  }, [categories, getCategoryKey, isFlowersCategory]);

  const ensureFlowersCategoryIds = useCallback((ids: string[]): string[] => {
    const normalized = Array.from(new Set(ids.map((id) => String(id).trim()).filter(Boolean)));
    if (flowersCategoryId && !normalized.includes(flowersCategoryId)) {
      normalized.unshift(flowersCategoryId);
    }
    return normalized;
  }, [flowersCategoryId]);

  const currentSubcategories = useMemo<ISubcategory[]>(() => {
    if (!draft.categoryId) return [];
    return categories.find(category => getCategoryKey(category) === String(draft.categoryId))?.subcategories || [];
  }, [categories, draft.categoryId, getCategoryKey]);

  const openCreateForm = useCallback(() => {
    const initialCategoryIds = flowersCategoryId ? [flowersCategoryId] : [];
    setDraft({
      ...emptyDraft,
      categoryIds: initialCategoryIds,
      categoryId: initialCategoryIds[0] || '',
    });
    setIsFormVisible(true);
    scrollToTop();
  }, [flowersCategoryId, scrollToTop]);

  const openEditForm = useCallback((product: IProduct) => {
    const validCategoryIds = new Set(categories.map((category) => getCategoryKey(category)).filter(Boolean));

    // Инициализируем categoryIds из product.categoryIds или из categoryId для обратной совместимости
    const rawCategoryIds = product.categoryIds && product.categoryIds.length > 0
      ? product.categoryIds
      : (product.categoryId ? [product.categoryId] : []);
    const categoryIds = ensureFlowersCategoryIds(rawCategoryIds
      .map((id) => String(id))
      .filter((id) => validCategoryIds.has(id)));

    const productPrimaryCategoryId = product.categoryId ? String(product.categoryId) : '';
    const primaryCategoryId = categoryIds.includes(productPrimaryCategoryId)
      ? productPrimaryCategoryId
      : (categoryIds.find((id) => id !== flowersCategoryId) || categoryIds[0] || '');

    setDraft({
      _id: product._id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      image: product.image,
      images: Array.from(new Set([...(product.images || []), product.image].filter(Boolean))).slice(0, 3),
      categoryId: primaryCategoryId,
      categoryIds,
      subcategoryId: product.subcategoryId ? String(product.subcategoryId) : '',
      inStock: product.inStock ?? true,
      preorderOnly: product.preorderOnly ?? false,
      assemblyTime: product.assemblyTime ?? '',
      stockQuantity: Math.max(0, Math.floor(product.stockQuantity ?? 0)),
      stockUnit: product.stockUnit?.trim() || 'шт.',
      pinnedInCategory: product.pinnedInCategory && categoryIds.includes(String(product.pinnedInCategory))
        ? String(product.pinnedInCategory)
        : '',
    });
    setIsFormVisible(true);
    scrollToTop();
  }, [categories, ensureFlowersCategoryIds, flowersCategoryId, getCategoryKey, scrollToTop]);

  const closeForm = useCallback(() => {
    setDraft(emptyDraft);
    setIsFormVisible(false);
  }, []);

  const updateDraft = useCallback(<K extends keyof AdminProductDraft>(field: K, value: AdminProductDraft[K]) => {
    setDraft((prev) => {
      if (field === 'categoryIds') {
        const nextCategoryIds = ensureFlowersCategoryIds((value as string[]).map((id) => String(id)));
        const hasCurrentPrimary = nextCategoryIds.includes(String(prev.categoryId || ''));
        const nextPrimary = hasCurrentPrimary
          ? String(prev.categoryId || '')
          : (nextCategoryIds.find((id) => id !== flowersCategoryId) || nextCategoryIds[0] || '');
        return {
          ...prev,
          categoryIds: nextCategoryIds,
          categoryId: nextPrimary,
          pinnedInCategory: nextCategoryIds.includes(prev.pinnedInCategory) ? prev.pinnedInCategory : '',
        };
      }

      if (field === 'categoryId') {
        const nextCategoryId = value as string;
        const hasCategoryChanged = String(prev.categoryId || '') !== String(nextCategoryId || '');
        return hasCategoryChanged
          ? { ...prev, categoryId: nextCategoryId, subcategoryId: '' }
          : { ...prev, categoryId: nextCategoryId };
      }

      return { ...prev, [field]: value };
    });
  }, [ensureFlowersCategoryIds, flowersCategoryId]);

  const saveDraft = useCallback(async () => {
    const validCategoryIds = new Set(categories.map((category) => getCategoryKey(category)).filter(Boolean));
    const normalizedCategoryIds = ensureFlowersCategoryIds(
      Array.from(new Set((draft.categoryIds || []).map((id) => String(id)).filter((id) => validCategoryIds.has(id))))
    );

    if (!draft.name.trim()) return showToast('Название товара обязательно', 'error');
    if (normalizedCategoryIds.length === 0) return showToast('Выберите хотя бы одну категорию', 'error');
    const images = Array.from(new Set((draft.images || []).map((src) => src?.trim()).filter(Boolean))).slice(0, 3);
    if (images.length === 0) return showToast('Добавьте хотя бы одно изображение товара', 'error');
    if (!Number.isFinite(draft.price) || draft.price <= 0) return showToast('Укажите корректную цену товара', 'error');

    const primaryCategoryId = normalizedCategoryIds.includes(draft.categoryId)
      ? draft.categoryId
      : (normalizedCategoryIds.find((id) => id !== flowersCategoryId) || normalizedCategoryIds[0]);

    // Проверяем, что pinnedInCategory входит в список выбранных категорий
    if (draft.pinnedInCategory && !normalizedCategoryIds.includes(draft.pinnedInCategory)) {
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
        categoryId: primaryCategoryId, // Главная категория
        categoryIds: normalizedCategoryIds,
        subcategoryId: draft.subcategoryId.trim(),
        inStock: draft.inStock,
        preorderOnly: draft.preorderOnly,
        assemblyTime: draft.assemblyTime.trim(),
        stockQuantity: Math.max(0, Math.floor(draft.stockQuantity)),
        stockUnit: draft.stockUnit.trim() || 'шт.',
        pinnedInCategory: normalizedCategoryIds.includes(draft.pinnedInCategory.trim()) ? draft.pinnedInCategory.trim() : '',
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
  }, [categories, closeForm, draft, ensureFlowersCategoryIds, flowersCategoryId, getCategoryKey, loadData, showToast]);

  const removeProduct = useCallback(async (product: IProduct) => {
    if (!window.confirm(`Удалить товар "${product.name}"?`)) return;
    if (!product._id) {
      const message = 'Не удалось удалить товар: отсутствует ID';
      setError(message);
      showToast(message, 'error');
      return;
    }

    try {
      await deleteProduct(product._id);
      setProducts((prev) => prev.filter((item) => item._id !== product._id));
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
