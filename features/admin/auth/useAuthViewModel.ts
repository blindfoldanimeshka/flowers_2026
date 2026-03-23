'use client';

import { useCallback, useEffect, useState } from 'react';
import { IUser } from '@/app/client/models/Auth';
import { getCurrentUser } from './service';

export function useAuthViewModel() {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, isAdmin: user?.role === 'admin', isLoading, error, refresh };
}

