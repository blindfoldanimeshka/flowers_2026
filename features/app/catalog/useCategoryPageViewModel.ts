'use client';

import { useCallback, useEffect, useState } from 'react';
import { ICategory } from '@/app/client/models/Category';
import { getCategoryBySlug } from './service';

export function useCategoryPageViewModel(slug?: string) {
  const [category, setCategory] = useState<ICategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategory = useCallback(async () => {
    if (!slug) {
      setCategory(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setCategory(await getCategoryBySlug(slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load category');
      setCategory(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadCategory(); }, [loadCategory]);
  return { category, loading, error, reload: loadCategory };
}

