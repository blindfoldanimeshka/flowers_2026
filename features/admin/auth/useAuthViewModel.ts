'use client';

import { useCallback, useEffect, useState } from 'react';
import { IUser } from '@/app/client/models/Auth';
import { getCurrentUser } from './service';

export function useAuthViewModel(enabled = true) {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setUser(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      setUser(await getCurrentUser());
    } catch (err) {
      setUser(null);
      setError(err instanceof Error ? err.message : 'Не удалось проверить авторизацию');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setUser(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    refresh();
  }, [enabled, refresh]);

  return { user, isAdmin: user?.role === 'admin', isLoading, error, refresh };
}

