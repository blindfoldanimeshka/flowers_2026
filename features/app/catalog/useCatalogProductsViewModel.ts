'use client';

import { useCallback, useEffect, useState } from 'react';
import { IProduct } from '@/app/client/models/Product';
import { getProductsByCategory, getProductsBySubcategory } from './service';

interface CatalogFilters {
  categoryId?: string;
  subcategoryId?: string;
}

export function useCatalogProductsViewModel({ categoryId, subcategoryId }: CatalogFilters) {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextProducts = subcategoryId ? await getProductsBySubcategory(subcategoryId) : categoryId ? await getProductsByCategory(categoryId) : [];

      // Сортируем: закрепленные товары в текущей категории идут первыми
      if (categoryId && nextProducts.length > 0) {
        nextProducts.sort((a, b) => {
          const aPinned = a.pinnedInCategory === categoryId;
          const bPinned = b.pinnedInCategory === categoryId;
          if (aPinned !== bPinned) return aPinned ? -1 : 1;
          return a.name.localeCompare(b.name, 'ru');
        });
      }

      setProducts(nextProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, subcategoryId]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  return { products, loading, error, isEmpty: !loading && products.length === 0, reload: loadProducts };
}

