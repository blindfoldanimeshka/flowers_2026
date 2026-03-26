'use client';

import { FormEvent, useCallback, useMemo, useState } from 'react';
import { useCart } from './index';
import { createOrder } from './service';

interface OrderFormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  paymentMethod: 'cash' | 'card';
  notes: string;
  deliveryType: 'delivery' | 'pickup';
}

const initialFormState: OrderFormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  paymentMethod: 'cash',
  notes: '',
  deliveryType: 'delivery',
};

export function useOrderFormViewModel() {
  const { cartItems, clearCart, getTotalPrice } = useCart();
  const [formData, setFormData] = useState<OrderFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = useCallback((name: keyof OrderFormState, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleDeliveryTypeChange = useCallback((value: 'delivery' | 'pickup') => {
    setFormData(prev => ({ ...prev, deliveryType: value, address: value === 'pickup' ? '' : prev.address }));
  }, []);

  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (cartItems.length === 0) {
      setError('Ваша корзина пуста.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await createOrder({
        customer: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          address: formData.deliveryType === 'pickup' ? 'Самовывоз' : formData.address,
        },
        items: cartItems.map(item => ({ productId: item.id, quantity: item.quantity })),
        paymentMethod: formData.paymentMethod,
        notes: formData.notes || undefined,
        deliveryType: formData.deliveryType,
        fulfillmentMethod: formData.deliveryType,
      });
      setSuccess(true);
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось оформить заказ');
    } finally {
      setIsLoading(false);
    }
  }, [cartItems, clearCart, formData]);

  const totalPrice = useMemo(() => getTotalPrice(), [getTotalPrice]);

  return {
    formData,
    isLoading,
    error,
    success,
    totalPrice,
    isCartEmpty: cartItems.length === 0,
    isDelivery: formData.deliveryType === 'delivery',
    handleChange,
    handleDeliveryTypeChange,
    handleSubmit,
  };
}

