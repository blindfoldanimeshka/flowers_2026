'use client';

import { FormEvent, startTransition, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from './service';

export function useLoginViewModel() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login({ username, password });
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подключиться к серверу');
    } finally {
      setIsLoading(false);
    }
  }, [password, router, username]);

  return { username, setUsername, password, setPassword, error, isLoading, handleSubmit };
}

