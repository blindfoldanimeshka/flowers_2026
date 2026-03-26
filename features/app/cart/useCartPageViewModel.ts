'use client';

import { useCallback, useState } from 'react';
import { useCart } from '@/app/context/CartContext';

export function useCartPageViewModel() {
  const { cartItems } = useCart();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const isCartEmpty = cartItems.length === 0;

  const openOrderForm = useCallback(() => {
    if (isCartEmpty) return;
    setShowOrderForm(true);
  }, [isCartEmpty]);

  const closeOrderForm = useCallback(() => setShowOrderForm(false), []);
  return { showOrderForm, openOrderForm, closeOrderForm, isCartEmpty };
}

