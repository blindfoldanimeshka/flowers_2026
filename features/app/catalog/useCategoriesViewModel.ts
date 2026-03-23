'use client';

import { useCallback, useEffect, useState } from 'react';
import { ICategory } from '@/app/client/models/Category';
import { getAllCategories } from './service';

export function useCategoriesViewModel() {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setCategories(await getAllCategories());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  return { categories, loading, error, reload: loadCategories };
}

