import { useState, useEffect } from 'react';

interface User {
  username: string;
  role: 'admin' | 'user';
}

interface UseAuthReturn {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setError(null);
        
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (err: any) {
        console.error('Ошибка при проверке авторизации:', err);
        setError(err.message);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return {
    user,
    isAdmin: user?.role === 'admin',
    isLoading,
    error,
  };
} 