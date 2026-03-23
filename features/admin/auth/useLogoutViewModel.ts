'use client';

import { startTransition, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from './service';

export function useLogoutViewModel() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      startTransition(() => router.push('/auth/login'));
    } finally {
      setIsLoggingOut(false);
    }
  }, [router]);

  return { isLoggingOut, handleLogout };
}

