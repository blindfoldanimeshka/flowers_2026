'use client';

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import Modal from '@/app/client/components/common/Modal';
import { useCart } from '@/features/app/cart';

interface ShopItemProps {
  id: string;
  title: string;
  price: number;
  oldPrice?: number;
  description?: string;
  imageSrc: string;
  imageGallery?: string[];
  inStock?: boolean;
  preorderOnly?: boolean;
  assemblyTime?: string;
  stockQuantity?: number;
  stockUnit?: string;
}

const DEFAULT_IMAGE = '/image/items/no_photo.jpg';
const MAX_GALLERY_IMAGES = 3;
const SWIPE_THRESHOLD_PX = 36;

const ShopItem = memo(({
  id,
  title = 'Название товара',
  price = 1000,
  oldPrice,
  description = 'Описание товара',
  imageSrc = DEFAULT_IMAGE,
  imageGallery,
  inStock = true,
  preorderOnly = false,
  assemblyTime,
  stockQuantity,
  stockUnit = 'шт.',
}: ShopItemProps) => {
  const { addToCart, isInCart, cartItems, updateQuantity } = useCart();

  const [itemCount, setItemCount] = useState(0);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [canUseHover, setCanUseHover] = useState(false);
  const [failedImageSrcs, setFailedImageSrcs] = useState<string[]>([]);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : null;
  const isPurchasable = inStock || preorderOnly;
  const normalizedStock = typeof stockQuantity === 'number' && Number.isFinite(stockQuantity)
    ? Math.max(0, Math.floor(stockQuantity))
    : null;

  const stockTextClass = useMemo(() => {
    if (normalizedStock == null) return 'text-gray-600';
    if (normalizedStock <= 2) return 'text-red-700';
    if (normalizedStock <= 5) return 'text-red-600';
    if (normalizedStock <= 10) return 'text-orange-600';
    return 'text-emerald-700';
  }, [normalizedStock]);

  const gallery = useMemo(() => {
    const merged = [...(imageGallery || []), imageSrc]
      .map((src) => src?.trim())
      .filter((src): src is string => Boolean(src));
    const unique = Array.from(new Set(merged)).slice(0, MAX_GALLERY_IMAGES);
    return unique.length > 0 ? unique : [DEFAULT_IMAGE];
  }, [imageSrc, imageGallery]);

  const activeSource = gallery[activeImageIndex] || DEFAULT_IMAGE;
  const displaySource = failedImageSrcs.includes(activeSource) ? DEFAULT_IMAGE : activeSource;

  useEffect(() => {
    const cartItem = cartItems.find((item) => item.id === id);
    setItemCount(cartItem ? cartItem.quantity : 0);
  }, [id, cartItems]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCanUseHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  useEffect(() => {
    setActiveImageIndex((prev) => Math.min(prev, gallery.length - 1));
  }, [gallery.length]);

  useEffect(() => {
    setFailedImageSrcs([]);
  }, [gallery]);

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
    if (!isPurchasable) return;

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

  const handleQuickAddToCart = () => {
    if (!isPurchasable) return;

    const existingItem = cartItems.find((item) => item.id === id);
    if (existingItem) {
      updateQuantity(id, existingItem.quantity + 1);
      return;
    }

    addToCart({ id, title, price, oldPrice, imageSrc: gallery[activeImageIndex] || imageSrc });
  };

  const handleQuickUpdateQuantity = (delta: number) => {
    if (!isPurchasable || itemCount <= 0) return;
    updateQuantity(id, Math.max(0, itemCount + delta));
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

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (canUseHover || gallery.length <= 1) return;
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (canUseHover || gallery.length <= 1 || !touchStartRef.current) return;

    const endTouch = event.changedTouches[0];
    if (!endTouch) return;

    const start = touchStartRef.current;
    const deltaX = endTouch.clientX - start.x;
    const deltaY = endTouch.clientY - start.y;
    touchStartRef.current = null;

    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;

    if (deltaX < 0) {
      setActiveImageIndex((prev) => Math.min(prev + 1, gallery.length - 1));
      return;
    }

    setActiveImageIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleImageError = () => {
    if (!activeSource || activeSource === DEFAULT_IMAGE || failedImageSrcs.includes(activeSource)) return;
    setFailedImageSrcs((prev) => [...prev, activeSource]);
  };

  const isAdded = isInCart(id);

  return (
    <>
      <article className="bg-[#FFE1E1] rounded-[30px] shadow-sm pb-0 flex flex-col items-center w-full min-w-0 max-w-none mx-0 min-h-[340px] sm:min-h-[380px] lg:min-h-[400px] xl:min-h-[420px] relative group overflow-hidden">
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
          className="w-full h-[160px] sm:h-[198px] lg:h-[210px] relative rounded-t-[30px] overflow-hidden flex-shrink-0 text-left"
          aria-label={`Открыть товар ${title}`}
          onMouseMove={handlePreviewMove}
          onMouseLeave={() => canUseHover && setActiveImageIndex(0)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={displaySource}
            alt={title}
            fill
            sizes="(max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
            className="rounded-t-[30px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            onError={handleImageError}
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

        <button type="button" onClick={openModal} className="flex flex-col items-center justify-center w-full flex-1 px-3 py-3 min-h-0 gap-2">
          <h4 className="text-sm sm:text-base lg:text-lg font-bold text-center leading-tight w-full line-clamp-2 overflow-hidden">
            {title}
          </h4>
          <div className="flex justify-center items-center gap-1 w-full text-center">
            {oldPrice && <p className="text-xs sm:text-sm text-gray-500 line-through text-center">{oldPrice} руб.</p>}
            <p className="text-sm sm:text-base lg:text-lg font-medium text-center">{price} руб.</p>
          </div>
          {preorderOnly && <p className="text-xs sm:text-sm font-semibold text-amber-700">Под заказ</p>}
        </button>

        <div className="w-full mt-auto flex-shrink-0">
          <button
            onClick={openModal}
            type="button"
            className={`sm:hidden ${isPurchasable ? 'bg-[#D8FEE9]' : 'bg-gray-200 cursor-not-allowed'} text-black font-medium py-2.5 px-2 rounded-[0_0_30px_30px] w-full`}
            disabled={!isPurchasable}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs whitespace-nowrap">{!isPurchasable ? 'Нет в наличии' : preorderOnly ? 'Оформить под заказ' : 'Открыть карточку'}</span>
            </div>
          </button>

          <div className={`hidden sm:flex items-center justify-between gap-2 px-3 py-2.5 rounded-[0_0_30px_30px] ${isPurchasable ? 'bg-[#D8FEE9]' : 'bg-gray-200'}`}>
            {!isPurchasable ? (
              <div className="w-full text-center text-sm font-medium text-gray-600">Нет в наличии</div>
            ) : (
              <>
                {itemCount > 0 ? (
                  <div className="inline-flex items-center rounded-full border border-[#2f1b26]/20 bg-white">
                    <button
                      type="button"
                      onClick={() => handleQuickUpdateQuantity(-1)}
                      className="h-7 w-7 text-sm font-semibold hover:bg-[#f7f7f7] rounded-l-full"
                      aria-label="Уменьшить количество"
                    >
                      -
                    </button>
                    <span className="min-w-7 text-center text-xs font-semibold">{itemCount}</span>
                    <button
                      type="button"
                      onClick={() => handleQuickUpdateQuantity(1)}
                      className="h-7 w-7 text-sm font-semibold hover:bg-[#f7f7f7] rounded-r-full"
                      aria-label="Увеличить количество"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-[#2f1b26]/70 truncate">Добавьте товар</span>
                )}

                <button
                  type="button"
                  onClick={handleQuickAddToCart}
                  className="rounded-full bg-[#2f1b26] px-3 py-1.5 text-xs text-white hover:bg-[#20131a] transition-colors whitespace-nowrap"
                >
                  {preorderOnly ? 'Под заказ' : isAdded ? 'Добавить еще' : 'В корзину'}
                </button>
              </>
            )}
          </div>
        </div>
      </article>

      <Modal
        isOpen={isProductModalOpen}
        onClose={closeModal}
        title={title}
        className="w-full !max-w-[1200px]"
      >
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-4 sm:gap-6 lg:gap-8">
          <div>
            <div
              className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#fff1f1]"
              onMouseMove={handlePreviewMove}
            >
              <Image
                src={displaySource}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                onError={handleImageError}
              />
            </div>

            {gallery.length > 1 && (
              <div className="mt-2 sm:mt-3 grid grid-cols-3 gap-2">
                {gallery.map((src, index) => (
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
            <p className="mt-2 text-sm text-gray-700">{description}</p>
            {preorderOnly && <p className="mt-2 text-sm font-semibold text-amber-700">Букет только под заказ</p>}
            {assemblyTime && <p className="mt-2 text-sm text-gray-700">Время сборки: {assemblyTime}</p>}
            {normalizedStock !== null && (
              <p className={`mt-2 text-sm font-semibold ${stockTextClass}`}>
                В наличии: {normalizedStock} {stockUnit}
              </p>
            )}

            <div className="mt-3 sm:mt-4 flex items-end gap-2">
              {oldPrice && <span className="text-sm text-gray-500 line-through">{oldPrice} руб.</span>}
              <span className="text-xl sm:text-2xl font-bold">{price} руб.</span>
            </div>

            <div className="mt-4 sm:mt-5">
              <p className="text-sm font-semibold mb-2">Количество</p>
              <div className="inline-flex items-center rounded-full border border-[#2f1b26]/20 bg-white">
                <button
                  type="button"
                  onClick={() => changeQuantity(-1)}
                  className="h-9 w-9 sm:h-10 sm:w-10 text-base sm:text-lg font-semibold hover:bg-[#f7f7f7] rounded-l-full"
                  aria-label="Уменьшить количество"
                >
                  -
                </button>
                <span className="min-w-9 sm:min-w-10 text-center text-sm sm:text-base font-semibold">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => changeQuantity(1)}
                  className="h-9 w-9 sm:h-10 sm:w-10 text-base sm:text-lg font-semibold hover:bg-[#f7f7f7] rounded-r-full"
                  aria-label="Увеличить количество"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!isPurchasable}
              className={`mt-5 sm:mt-6 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-semibold transition-colors ${
                isPurchasable ? 'bg-[#2f1b26] text-white hover:bg-[#20131a]' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isPurchasable
                ? preorderOnly
                  ? `Оформить под заказ (${quantity})`
                  : `Добавить в корзину (${quantity})`
                : 'Нет в наличии'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
});

ShopItem.displayName = 'ShopItem';

export default ShopItem;
