'use client';

import { useCallback, useEffect, useState } from 'react';
import { ISubcategory } from '@/app/client/models/Category';
import { getSubcategoryBySlug } from './service';

export function useSubcategoryPageViewModel(slug?: string) {
  const [subcategory, setSubcategory] = useState<ISubcategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubcategory = useCallback(async () => {
    if (!slug) {
      setSubcategory(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setSubcategory(await getSubcategoryBySlug(slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subcategory');
      setSubcategory(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadSubcategory(); }, [loadSubcategory]);
  return { subcategory, loading, error, reload: loadSubcategory };
}

