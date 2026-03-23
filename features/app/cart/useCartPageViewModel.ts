'use client';

import { useCallback, useState } from 'react';

export function useCartPageViewModel() {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const openOrderForm = useCallback(() => setShowOrderForm(true), []);
  const closeOrderForm = useCallback(() => setShowOrderForm(false), []);
  return { showOrderForm, openOrderForm, closeOrderForm };
}

