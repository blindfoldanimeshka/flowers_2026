'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/features/app/cart';
import Modal from '@/app/client/components/common/Modal';
import { AnimatePresence, motion } from 'framer-motion';

interface ShopItemProps {
  id: string;
  title: string;
  price: number;
  oldPrice?: number;
  description?: string;
  imageSrc: string;
  imageGallery?: string[];
  inStock?: boolean;
}

const ShopItem = memo(({
  id,
  title = 'Название товара',
  price = 1000,
  oldPrice,
  description = 'Описание товара',
  imageSrc = '/image/items/11.png',
  imageGallery,
  inStock = true,
}: ShopItemProps) => {
  const { addToCart, isInCart, cartItems, updateQuantity } = useCart();

  const [itemCount, setItemCount] = useState(0);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [canUseHover, setCanUseHover] = useState(false);

  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : null;

  const gallery = useMemo(() => {
    const fallback = imageSrc || '/image/items/11.png';
    const sources = [fallback, ...(imageGallery || [])].filter(Boolean);
    return Array.from(new Set(sources));
  }, [imageSrc, imageGallery]);

  useEffect(() => {
    const cartItem = cartItems.find((item) => item.id === id);
    setItemCount(cartItem ? cartItem.quantity : 0);
  }, [id, cartItems]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCanUseHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  const openModal = () => {
    setIsProductModalOpen(true);
    setQuantity(1);
    setActiveImageIndex(0);
  };

  const closeModal = () => {
    setIsProductModalOpen(false);
    setQuantity(1);
  };

  const changeQuantity = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddToCart = () => {
    if (!inStock) return;

    const existingItem = cartItems.find((item) => item.id === id);
    if (existingItem) {
      updateQuantity(id, existingItem.quantity + quantity);
    } else {
      addToCart({ id, title, price, oldPrice, imageSrc: gallery[activeImageIndex] || imageSrc });
      if (quantity > 1) {
        updateQuantity(id, quantity);
      }
    }

    closeModal();
  };

  const handlePreviewMove = (event: React.MouseEvent<HTMLElement>) => {
    if (!canUseHover || gallery.length <= 1) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = Math.min(0.999, Math.max(0, x / rect.width));
    const nextIndex = Math.floor(ratio * gallery.length);

    if (nextIndex !== activeImageIndex) {
      setActiveImageIndex(nextIndex);
    }
  };

  const isAdded = isInCart(id);

  return (
    <>
      <article className="bg-[#FFE1E1] rounded-[30px] shadow-sm pb-0 flex flex-col items-center w-full min-w-[240px] max-w-[280px] sm:min-w-[260px] sm:max-w-[320px] mx-auto h-[400px] sm:h-[450px] relative group overflow-hidden">
        <AnimatePresence>
          {discount && (
            <motion.div
              className="absolute top-2 left-2 z-20 bg-[#FF6B6B] text-white font-bold px-2 py-0.5 rounded-full text-xs sm:text-sm"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              -{discount}%
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {itemCount > 0 && (
            <motion.div
              className="absolute top-2 right-2 z-20 bg-[#D8FEE9] text-black font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-xs sm:text-sm"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              {itemCount}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={openModal}
          className="w-full h-[210px] sm:h-[260px] relative rounded-t-[30px] overflow-hidden flex-shrink-0 text-left"
          aria-label={`Открыть товар ${title}`}
          onMouseMove={handlePreviewMove}
          onMouseLeave={() => canUseHover && setActiveImageIndex(0)}
        >
          <Image
            src={gallery[activeImageIndex] || imageSrc}
            alt={title}
            fill
            sizes="100vw"
            className="rounded-t-[30px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />

          <div className="absolute inset-0 z-[10] bg-gradient-to-t from-black/35 via-transparent to-transparent" />

          {gallery.length > 1 && (
            <div className="absolute bottom-2 left-1/2 z-[11] flex -translate-x-1/2 gap-1.5">
              {gallery.map((_, index) => (
                <span
                  key={`${id}-dot-${index}`}
                  className={`h-1.5 rounded-full transition-all ${
                    activeImageIndex === index ? 'w-5 bg-white' : 'w-2 bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </button>

        <button type="button" onClick={openModal} className="flex flex-col items-center justify-center w-full flex-1 px-2">
          <h4 className="text-base sm:text-xl font-bold text-center leading-tight w-full mt-2 line-clamp-2 overflow-hidden max-h-[2.8em]">
            {title}
          </h4>
          <p className="sm:hidden text-xs text-gray-700 text-center px-3 mt-1 line-clamp-2">{description}</p>
          <div className="flex justify-center items-center gap-1 w-full text-center mt-1">
            {oldPrice && <p className="text-xs sm:text-sm text-gray-500 line-through text-center">{oldPrice} руб.</p>}
            <p className="text-base sm:text-xl font-medium text-center">{price} руб.</p>
          </div>
        </button>

        <button
          onClick={openModal}
          type="button"
          className={`${inStock ? 'bg-[#D8FEE9]' : 'bg-gray-200 cursor-not-allowed'} text-black font-medium py-2 sm:py-3 px-2 sm:px-4 rounded-[0_0_30px_30px] w-full mt-auto`}
          disabled={!inStock}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs sm:text-sm whitespace-nowrap">
              {!inStock ? 'Нет в наличии' : isAdded ? 'Добавить еще' : 'Открыть карточку'}
            </span>
          </div>
        </button>
      </article>

      <Modal isOpen={isProductModalOpen} onClose={closeModal} title={title} className="max-w-3xl w-full">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-5 sm:gap-6">
          <div>
            <div
              className="relative w-full h-[280px] sm:h-[340px] rounded-2xl overflow-hidden bg-[#fff1f1]"
              onMouseMove={handlePreviewMove}
            >
              <Image
                src={gallery[activeImageIndex] || imageSrc}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {gallery.slice(0, 4).map((src, index) => (
                  <button
                    key={`${id}-thumb-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative h-16 rounded-lg overflow-hidden border-2 ${
                      activeImageIndex === index ? 'border-[#2f1b26]' : 'border-transparent'
                    }`}
                    aria-label={`Фото ${index + 1}`}
                  >
                    <Image src={src} alt={`${title} ${index + 1}`} fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <h3 className="text-xl sm:text-2xl font-bold leading-tight">{title}</h3>
            <p className="mt-2 text-sm text-gray-700">{description}</p>

            <div className="mt-4 flex items-end gap-2">
              {oldPrice && <span className="text-sm text-gray-500 line-through">{oldPrice} руб.</span>}
              <span className="text-2xl font-bold">{price} руб.</span>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold mb-2">Количество</p>
              <div className="inline-flex items-center rounded-full border border-[#2f1b26]/20 bg-white">
                <button
                  type="button"
                  onClick={() => changeQuantity(-1)}
                  className="h-10 w-10 text-lg font-semibold hover:bg-[#f7f7f7] rounded-l-full"
                  aria-label="Уменьшить количество"
                >
                  -
                </button>
                <span className="min-w-10 text-center text-base font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => changeQuantity(1)}
                  className="h-10 w-10 text-lg font-semibold hover:bg-[#f7f7f7] rounded-r-full"
                  aria-label="Увеличить количество"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock}
              className={`mt-6 rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
                inStock ? 'bg-[#2f1b26] text-white hover:bg-[#20131a]' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {inStock ? `Добавить в корзину (${quantity})` : 'Нет в наличии'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
});

ShopItem.displayName = 'ShopItem';

export default ShopItem;
