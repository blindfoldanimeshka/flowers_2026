'use client';

import { useCallback, useEffect, useState } from 'react';
import { IProduct } from '@/app/client/models/Product';
import { getAllCategories, getAllProducts } from './service';

export function useHomeCatalogViewModel() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<IProduct[]>([]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [allProducts, categories] = await Promise.all([getAllProducts(), getAllCategories()]);

      const categoryOrder = new Map<string, number>();
      categories
        .sort((a, b) => a.id - b.id)
        .forEach((category, index) => categoryOrder.set(String(category._id), index));

      const validProducts = allProducts.filter((product) => {
        if (!product) return false;
        if (!product._id || !product.name?.trim()) return false;
        if (!Number.isFinite(product.price) || product.price <= 0) return false;
        if (!product.image || !product.image.trim()) return false;
        if (!product.categoryId) return false;
        return categoryOrder.has(String(product.categoryId));
      });

      validProducts.sort((a, b) => {
        const aOrder = categoryOrder.get(String(a.categoryId)) ?? Number.MAX_SAFE_INTEGER;
        const bOrder = categoryOrder.get(String(b.categoryId)) ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;

        // Закрепленные товары в категории идут первыми
        const aPinned = a.pinnedInCategory === a.categoryId;
        const bPinned = b.pinnedInCategory === b.categoryId;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;

        return a.name.localeCompare(b.name, 'ru');
      });

      setProducts(validProducts);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  return { loading, products };
}
