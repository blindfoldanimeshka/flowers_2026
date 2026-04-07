'use client'

import React, { memo, useCallback } from "react";
import Image from "next/image";
import { CartItem as CartItemType, useCart } from '@/features/app/cart';

interface CartItemProps {
  item: CartItemType;
}

const CartItem = memo(({ item }: CartItemProps) => {
  const { updateQuantity, removeFromCart } = useCart();

  const incrementQuantity = useCallback(() => {
    updateQuantity(item.id, item.quantity + 1);
  }, [item.id, item.quantity, updateQuantity]);

  const decrementQuantity = useCallback(() => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
      return;
    }
    removeFromCart(item.id);
  }, [item.id, item.quantity, updateQuantity, removeFromCart]);

  const handleRemove = useCallback(() => {
    removeFromCart(item.id);
  }, [item.id, removeFromCart]);

  const totalPrice = item.price * item.quantity;

  return (
    <div className="rounded-2xl border border-[#FFDADA] bg-white p-3 shadow-sm sm:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr] sm:gap-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#fff6f6] sm:h-[120px] sm:w-[120px]">
        <Image
          src={item.imageSrc}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 92vw, 120px"
          loading="eager"
          style={{ objectFit: 'cover', transform: 'translateZ(0)' }}
          className="will-change-transform"
        />
      </div>

        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-[#2e2e2e] sm:text-lg">{item.title}</h3>
          <p className="mt-1 text-sm text-[#8d4a4a]">{item.price} ₽ / шт.</p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="inline-flex items-center rounded-xl border border-[#ffcccc] bg-[#fff7f7] p-1">
              <button
                onClick={decrementQuantity}
                className="h-8 w-8 rounded-lg text-base font-bold leading-none text-[#5f4150] transition hover:bg-[#ffe7e7]"
                aria-label="Уменьшить количество"
              >
                -
              </button>
              <span className="min-w-[28px] text-center text-sm font-semibold text-[#2e2e2e]">{item.quantity}</span>
              <button
                onClick={incrementQuantity}
                className="h-8 w-8 rounded-lg text-base font-bold leading-none text-[#5f4150] transition hover:bg-[#ffe7e7]"
                aria-label="Увеличить количество"
              >
                +
              </button>
            </div>

            <div className="text-right text-sm font-medium text-[#8d4a4a]">
              Итого: <span className="font-semibold text-[#2e2e2e]">{totalPrice} ₽</span>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={handleRemove}
              aria-label="Удалить товар из корзины"
              className="inline-flex items-center rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor" aria-hidden="true">
                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

CartItem.displayName = 'CartItem';

export default CartItem;
