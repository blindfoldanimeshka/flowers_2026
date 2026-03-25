'use client'

import React, { useCallback, memo } from "react";
import Image from "next/image";
import { CartItem as CartItemType, useCart } from '@/features/app/cart';

interface CartItemProps {
  item: CartItemType;
}

const CartItem = memo(({ item }: CartItemProps) => {
    const { updateQuantity, removeFromCart } = useCart();
    
    const incrementQuantity = useCallback(() => {
      const newQuantity = item.quantity + 1;
      // Сразу обновляем количество без дополнительных проверок
      updateQuantity(item.id, newQuantity);
    }, [item.id, item.quantity, updateQuantity]);
    
    const decrementQuantity = useCallback(() => {
      if (item.quantity > 1) {
        const newQuantity = item.quantity - 1;
        // Сразу обновляем количество без дополнительных проверок
        updateQuantity(item.id, newQuantity);
      } else {
        // Если количество = 1, то удаляем товар из корзины
        removeFromCart(item.id);
      }
    }, [item.id, item.quantity, updateQuantity, removeFromCart]);
    
    const handleRemove = useCallback(() => {
      // Сразу удаляем товар без дополнительных проверок
      removeFromCart(item.id);
    }, [item.id, removeFromCart]);
    
    // Мемоизация промежуточных вычислений
    const totalPrice = item.price * item.quantity;
    
    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white border-[1px] border-[#FFDADA] p-3 rounded-[15px] shadow-sm hover:shadow-md transition-shadow duration-300 will-change-transform">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <div className="w-[100px] h-[120px] relative rounded-[10px] overflow-hidden">
                    <Image 
                        src={item.imageSrc} 
                        alt={item.title} 
                        fill 
                        sizes="100px"
                        loading="eager"
                        style={{
                            objectFit: 'cover',
                            transform: 'translateZ(0)', // Включает аппаратное ускорение
                        }}
                        className="rounded-lg will-change-transform"
                        onLoadingComplete={(img) => {
                            img.classList.add('transition-transform', 'duration-300', 'hover:scale-105');
                        }}
                    />
                </div>
                <div className="text-center sm:text-left">
                    <h2 className="text-lg font-semibold">{item.title}</h2>
                    <p className="text-gray-600 mt-1">Цена: {item.price} ₽</p>
                    <p className="text-lg font-bold mt-2">Итого: {totalPrice} ₽</p>
                </div>
            </div>
            
            <div className="flex items-center gap-1">
                <button 
                    onClick={decrementQuantity}
                    className="bg-[#FFE1E1] p-1.5 rounded-full hover:bg-[#FFD1D1] transition-colors duration-300"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#000"><path d="M200-440v-80h560v80H200Z" /></svg>
                </button>
                <span className="text-lg font-medium mx-1">{item.quantity}</span>
                <button 
                    onClick={incrementQuantity}
                    className="bg-[#FFE1E1] p-1.5 rounded-full hover:bg-[#FFD1D1] transition-colors duration-300"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#000"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" /></svg>
                </button>
            </div>
            <button 
                onClick={handleRemove}
                className="bg-[#ffcece] p-1.5 rounded-full hover:bg-[#ffb5b5] transition-colors duration-300"
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#000"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" /></svg>
            </button>
        </div>
    );
});

CartItem.displayName = 'CartItem';

export default CartItem;
