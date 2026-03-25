'use client'

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CartItemSection from "@/app/client/cart/components/widget/CartItemSection";
import OrderForm from './OrderForm';
import { useCartPageViewModel } from '@/features/app/cart';

const scrollbarStyles = `
  .cart-items::-webkit-scrollbar { width: 6px; }
  .cart-items::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
  .cart-items::-webkit-scrollbar-thumb { background: #FFDADA; border-radius: 10px; }
  .cart-items::-webkit-scrollbar-thumb:hover { background: #FFB6B6; }
`;

export default function CartPage() {
  const { showOrderForm, openOrderForm, closeOrderForm } = useCartPageViewModel();

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = scrollbarStyles;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <motion.div className="w-full max-w-[1600px] mx-auto px-4 mt-[80px] md:mt-[140px] mb-20 md:mb-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <motion.h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
        Ваша корзина
      </motion.h1>
      <div className="flex flex-col lg:flex-row w-full gap-6 md:gap-70 min-h-[400px] h-full">
        <motion.div className="cart-items w-full lg:w-3/5 max-h-[calc(100vh-300px)] md:h-[calc(100vh-200px)] overflow-y-auto pr-2 min-h-[340px] h-full flex flex-col" initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <CartItemSection />
        </motion.div>
        <motion.div className="w-full lg:w-2/5 flex flex-col lg:min-h-[340px] lg:h-full" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <div className="block lg:hidden">
            {!showOrderForm && <motion.button className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300" onClick={openOrderForm} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Заказать</motion.button>}
            <AnimatePresence>
              {showOrderForm && (
                <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeOrderForm}>
                  <motion.div className="relative bg-[#FFF8F8] p-6 rounded-2xl shadow-lg w-full max-w-md mx-auto" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: "spring", damping: 25 }} onClick={(e) => e.stopPropagation()}>
                    <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none" onClick={closeOrderForm} aria-label="Закрыть">×</button>
                    <OrderForm />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="hidden lg:block"><OrderForm /></div>
        </motion.div>
      </div>
    </motion.div>
  );
}
