'use client';

import { useCallback, useEffect, useState } from 'react';
import { IProduct } from '@/app/client/models/Product';
import { getAllProducts } from './service';

export function useHomeCatalogViewModel() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<IProduct[]>([]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await getAllProducts());
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  return { loading, products };
}

