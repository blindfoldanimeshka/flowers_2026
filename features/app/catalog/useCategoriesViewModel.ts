'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ICategory } from '@/app/client/models/Category';
import { getAllCategories, invalidateCategoriesClientCache } from './service';

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

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const channel = supabase
      .channel('catalog-categories-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, async () => {
        invalidateCategoriesClientCache();
        await loadCategories();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subcategories' }, async () => {
        invalidateCategoriesClientCache();
        await loadCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCategories]);

  return { categories, loading, error, reload: loadCategories };
}
