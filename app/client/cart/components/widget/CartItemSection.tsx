'use client'

import React, { useState, useEffect, useMemo } from "react";
import CartItem from "../element/CartItem";
import CartItemSkeleton from "../element/CartItemSkeleton";
import { useCart } from "../../../../context/CartContext";
import { products } from "../../../../data/products";
import { motion, AnimatePresence } from "framer-motion";

const CartItemSection = () => {
    const { cartItems, clearCart } = useCart();
    console.log('CART ITEMS DEBUG:', cartItems);
    const [loading, setLoading] = useState(true);
    const [displayedItems, setDisplayedItems] = useState<typeof cartItems>([]);
    
    // Используем useEffect только для загрузки данных
    useEffect(() => {
        // Имитируем небольшую задержку загрузки для плавной анимации
        const timer = setTimeout(() => {
            setDisplayedItems(cartItems);
            setLoading(false);
        }, 100); // Небольшая задержка для плавной анимации
        
        return () => clearTimeout(timer);
    }, [cartItems]);
    
    // Мемоизируем скелетоны для предотвращения ненужных ререндеров
    const skeletons = useMemo(() => (
        <div className="grid gap-4 pb-4">
            <div className="bg-[#FFE9E9] rounded-[15px] p-3 shadow-sm">
                <h2 className="text-lg font-bold mb-3">Загрузка корзины...</h2>
                <div className="grid gap-3">
                    {Array(3).fill(0).map((_, index) => (
                        <CartItemSkeleton key={index} />
                    ))}
                </div>
            </div>
        </div>
    ), []);
    
    // Мемоизируем сообщение о пустой корзине
    const emptyCart = useMemo(() => (
        <div className="grid gap-4 pb-4">
            <div className="bg-[#FFE9E9] rounded-[15px] p-8 shadow-sm text-center">
                <h2 className="text-lg font-bold mb-3">Ваша корзина пуста</h2>
                <p className="text-gray-700">Добавьте товары в корзину, чтобы оформить заказ</p>
            </div>
        </div>
    ), []);
    
    // Мемоизируем список товаров
    const itemsList = useMemo(() => (
        <div className="grid gap-4 pb-4">
            <motion.div 
                className="bg-[#FFE9E9] rounded-[15px] p-3 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <h2 className="text-lg font-bold mb-3">Товары в корзине</h2>
                <AnimatePresence mode="wait">
                    <motion.div className="grid gap-3">
                        {displayedItems.map((item, index) => (
                            <motion.div 
                                key={item.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <CartItem item={item} />
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
                {/* Кнопка очистки корзины */}
                <motion.button
                  onClick={clearCart}
                  className="mt-6 w-full bg-[#FFB6B6] text-white font-bold py-3 px-4 rounded-[15px] hover:bg-[#ff9e9e] transition-colors duration-300 text-base sm:text-lg shadow-md"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Очистить корзину
                </motion.button>
            </motion.div>
        </div>
    ), [displayedItems, clearCart]);
    
    if (loading) {
        return skeletons;
    }
    if (displayedItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[120px] w-full">
                <div className="bg-[#FFE9E9] rounded-[15px] p-8 shadow-sm text-center w-full">
                    <h2 className="text-lg sm:text-xl font-bold mb-3">Ваша корзина пуста</h2>
                    <p className="text-gray-700">Добавьте товары в корзину, чтобы оформить заказ</p>
                </div>
            </div>
        );
    }
    
    return itemsList;
};

export default React.memo(CartItemSection);
