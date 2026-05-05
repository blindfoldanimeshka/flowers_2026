'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { IProduct } from '@/app/client/models/Product';
import { getProductsByCategory, getProductsBySubcategory, invalidateProductsClientCache } from './service';

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

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const channel = supabase
      .channel(`catalog-products-${categoryId || 'all'}-${subcategoryId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        invalidateProductsClientCache();
        await loadProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId, subcategoryId, loadProducts]);

  return { products, loading, error, isEmpty: !loading && products.length === 0, reload: loadProducts };
}

