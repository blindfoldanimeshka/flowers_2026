'use client'

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Modal from '@/app/client/components/common/Modal';
import CartItemSection from '@/app/client/cart/components/widget/CartItemSection';
import OrderForm from './OrderForm';
import { useCartPageViewModel } from '@/features/app/cart';

const scrollbarStyles = `
  .cart-items::-webkit-scrollbar { width: 6px; }
  .cart-items::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
  .cart-items::-webkit-scrollbar-thumb { background: #FFDADA; border-radius: 10px; }
  .cart-items::-webkit-scrollbar-thumb:hover { background: #FFB6B6; }
`;

export default function CartPage() {
  const { showOrderForm, openOrderForm, closeOrderForm, isCartEmpty } = useCartPageViewModel();

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = scrollbarStyles;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <motion.div
      className="w-full max-w-[1600px] mx-auto px-4 mt-[calc(var(--mobile-top-offset)+16px)] lg:mt-[140px] mb-20 md:mb-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        Ваша корзина
      </motion.h1>

      <div className="flex flex-col lg:flex-row w-full gap-6 md:gap-70 min-h-[400px] h-full">
        <motion.div
          className="cart-items w-full lg:w-3/5 max-h-[calc(var(--app-dvh)-300px)] md:h-[calc(var(--app-dvh)-220px)] overflow-y-auto pr-2 min-h-[340px] h-full flex flex-col"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <CartItemSection />
        </motion.div>

        <motion.div
          className="w-full lg:w-2/5 flex flex-col lg:min-h-[340px] lg:h-full"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="block lg:hidden">
            {!showOrderForm && (
              <motion.button
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={openOrderForm}
                disabled={isCartEmpty}
                whileHover={{ scale: isCartEmpty ? 1 : 1.02 }}
                whileTap={{ scale: isCartEmpty ? 1 : 0.98 }}
              >
                Заказать
              </motion.button>
            )}

            <Modal
              isOpen={showOrderForm}
              onClose={closeOrderForm}
              title="Оформление заказа"
              className="w-full max-w-md"
              contentClassName="!p-0"
            >
              <OrderForm hideTitle />
            </Modal>
          </div>

          <div className="hidden lg:block">
            <OrderForm />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
