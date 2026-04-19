'use client';

import { useEffect, useState } from 'react';
import { IMaskInput } from 'react-imask';
import { useOrderFormViewModel } from '@/features/app/cart';

interface PublicSettings {
  address?: string;
}

interface OrderFormProps {
  hideTitle?: boolean;
}

export default function OrderForm({ hideTitle = false }: OrderFormProps) {
  const {
    formData,
    isLoading,
    error,
    success,
    totalPrice,
    isCartEmpty,
    isDelivery,
    handleChange,
    handleDeliveryTypeChange,
    handleSubmit,
  } = useOrderFormViewModel();

  const [pickupAddress, setPickupAddress] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' });
        if (!response.ok) return;

        const data = (await response.json()) as { settings?: PublicSettings };
        if (isMounted) {
          setPickupAddress(data.settings?.address || '');
        }
      } catch {
        if (isMounted) {
          setPickupAddress('');
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  if (success) {
    return (
      <div className="bg-[#FFF8F8] p-6 rounded-2xl shadow-lg h-full flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-green-600 mb-4">Заказ успешно оформлен!</h2>
        <p className="text-gray-700">Наш менеджер скоро свяжется с вами. Спасибо за покупку!</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFF8F8] p-6 rounded-2xl shadow-lg h-full flex flex-col">
      {!hideTitle && <h2 className="text-xl md:text-2xl font-bold mb-5">Оформление заказа</h2>}

      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="grid gap-3">
          <h3 className="text-base md:text-lg font-semibold">Ваши данные</h3>

          <input
            type="text"
            placeholder="Имя *"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            name="name"
            className="w-full border-[#FFDADA] border-[2px] h-[45px] rounded-[20px] p-3 focus:outline-none focus:border-[#FFB6B6] transition-colors"
          />

          <IMaskInput
            mask="+7 (000) 000-00-00"
            value={formData.phone}
            onAccept={(value) => handleChange('phone', value)}
            type="tel"
            name="phone"
            placeholder="Телефон *"
            required
            className="w-full border-[#FFDADA] border-[2px] h-[45px] rounded-[20px] p-3 focus:outline-none focus:border-[#FFB6B6] transition-colors"
          />

          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            name="email"
            className="w-full border-[#FFDADA] border-[2px] h-[45px] rounded-[20px] p-3 focus:outline-none focus:border-[#FFB6B6] transition-colors"
          />

          <input
            type="text"
            placeholder="Адрес доставки"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            name="address"
            required={isDelivery}
            disabled={!isDelivery}
            className="w-full border-[#FFDADA] border-[2px] h-[45px] rounded-[20px] p-3 focus:outline-none focus:border-[#FFB6B6] transition-colors disabled:bg-gray-100"
          />
        </div>

        <div className="mb-4 mt-3">
          <label className="font-semibold mb-2 block">Способ получения</label>
          <div className="flex gap-4">
            <label>
              <input
                type="radio"
                name="deliveryType"
                value="delivery"
                checked={formData.deliveryType === 'delivery'}
                onChange={() => handleDeliveryTypeChange('delivery')}
              />
              <span className="ml-2">Доставка</span>
            </label>

            <label>
              <input
                type="radio"
                name="deliveryType"
                value="pickup"
                checked={formData.deliveryType === 'pickup'}
                onChange={() => handleDeliveryTypeChange('pickup')}
              />
              <span className="ml-2">Самовывоз</span>
            </label>
          </div>
        </div>

        {!isDelivery && pickupAddress && (
          <div className="mb-4 rounded-xl border border-[#FFDADA] bg-white/80 p-3 text-sm text-[#5f4150]">
            <p className="font-semibold">Адрес точки самовывоза:</p>
            <p>{pickupAddress}</p>
          </div>
        )}

        {isDelivery && (
          <div className="mb-4">
            <label className="block mb-1 font-medium">Способ оплаты</label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={(e) => handleChange('paymentMethod', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white"
            >
              <option value="cash">Наличными при получении</option>
              <option value="card">Картой при получении</option>
            </select>
          </div>
        )}

        <div className="mt-auto">
          <div className="text-lg font-bold mb-4">Итого: {totalPrice} ₽</div>
          {error && <p className="text-red-500 mb-2">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || isCartEmpty}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 disabled:bg-gray-400"
          >
            {isLoading ? 'Оформление...' : 'Оформить заказ'}
          </button>
        </div>
      </form>
    </div>
  );
}
