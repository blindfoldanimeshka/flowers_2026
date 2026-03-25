'use client'

import React, { useEffect, useState, useCallback, memo } from "react";
import Image from "next/image";
import { useCart } from '@/features/app/cart';
import { motion, AnimatePresence } from "framer-motion";

interface ShopItemProps {
  id: string;
  title: string;
  price: number;
  oldPrice?: number;
  description?: string;
  imageSrc: string;
  inStock?: boolean;
}

const ShopItem = memo(({
  id,
  title = "Название товара",
  price = 1000,
  oldPrice,
  description = "Описание товара",
  imageSrc = "/image/items/11.png",
  inStock = true
}: ShopItemProps) => {
    const { addToCart, isInCart, cartItems, updateQuantity } = useCart();
    const [isAdded, setIsAdded] = useState(false);
    const [itemCount, setItemCount] = useState(0);
    const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : null;

    useEffect(() => {
      const inCart = isInCart(id);
      setIsAdded(inCart);

      const cartItem = cartItems.find(item => item.id === id);
      setItemCount(cartItem ? cartItem.quantity : 0);
    }, [id, isInCart, cartItems]);

    const handleToggleCart = useCallback(() => {
      if (!inStock) return;

      if (isAdded) {
        const cartItem = cartItems.find(item => item.id === id);
        if (cartItem && cartItem.quantity > 1) {
          updateQuantity(id, cartItem.quantity - 1);
        } else {
          updateQuantity(id, 0);
          setIsAdded(false);
        }
      } else {
        addToCart({ id, title, price, oldPrice, imageSrc });
        setIsAdded(true);
      }
    }, [isAdded, inStock, cartItems, id, updateQuantity, addToCart, title, price, oldPrice, imageSrc]);

    return (
      <>
        <div className="bg-[#FFE1E1] rounded-[30px] shadow-sm pb-0 flex flex-col items-center w-full min-w-[240px] max-w-[280px] sm:min-w-[260px] sm:max-w-[320px] mx-auto h-[400px] sm:h-[450px] relative group">
        <AnimatePresence>
          {discount && (
            <motion.div
              className="absolute top-2 left-2 z-10 bg-[#FF6B6B] text-white font-bold px-1.5 py-0.5 rounded-full text-xs sm:text-sm"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", damping: 15 }}
            >
              -{discount}%
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAdded && itemCount > 0 && (
            <motion.div
              className="absolute top-2 right-2 z-10 bg-[#D8FEE9] text-black font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-xs sm:text-sm"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", damping: 20 }}
            >
              {itemCount}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full h-[210px] sm:h-[260px] relative rounded-t-[30px] overflow-hidden flex-shrink-0">
          <Image
            src={imageSrc}
            alt={title}
            fill
            priority
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
              transform: 'translateZ(0)',
            }}
            className="rounded-t-[30px] will-change-transform"
            onLoadingComplete={(img) => {
              img.classList.add('transition-all', 'duration-500', 'group-hover:scale-[0.95]', 'group-hover:blur-sm', 'group-hover:brightness-50');
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 z-10">
            <p className="text-white text-xs sm:text-sm text-center">{description}</p>
            {!inStock && (
              <span className="mt-1.5 bg-white/80 text-red-500 px-1.5 py-0.5 rounded text-xs sm:text-sm font-medium">
                Нет в наличии
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center w-full flex-1">
          <h4 className="text-base sm:text-xl font-bold text-center leading-tight w-full mt-2 line-clamp-2 overflow-hidden max-h-[2.8em]">{title}</h4>
          <div className="flex justify-center items-center gap-1 w-full text-center mt-1">
            {oldPrice && (
              <p className="text-xs sm:text-sm text-gray-500 line-through text-center">{oldPrice} руб.</p>
            )}
            <p className="text-base sm:text-xl font-medium text-center">{price} руб.</p>
          </div>
        </div>
        <button
          onClick={handleToggleCart}
          type="button"
          className={`${inStock ? (isAdded ? 'bg-[#A9E2C8]' : 'bg-[#D8FEE9]') : 'bg-gray-200 cursor-not-allowed'} text-black font-middle py-2 sm:py-3 px-2 sm:px-4 rounded-[0_0_30px_30px] cursor-pointer w-full mt-auto`}
          disabled={!inStock}
        >
          <div className="flex items-center justify-center gap-2">
            {isAdded ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            )}
            <span className="transition-all duration-300 text-xs sm:text-sm whitespace-nowrap">
              {!inStock ? "Нет в наличии" : isAdded ? "Убрать" : "Добавить в корзину"}
            </span>
          </div>
        </button>
      </div>
      </>
    );
  }
);

ShopItem.displayName = 'ShopItem';

export default ShopItem;
