'use client'

import React, { createContext, useContext, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';

// Интерфейс для товара в корзине
export interface CartItem {
  id: string; // Будем сохранять id как string для совместимости
  title: string;
  price: number;
  oldPrice?: number;
  imageSrc: string;
  quantity: number;
}

// Типы действий для редьюсера
type CartAction = 
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'SET_ITEMS'; payload: CartItem[] }
  | { type: 'CLEAR_CART' };

// Состояние корзины
interface CartState {
  items: CartItem[];
}

// Редьюсер для управления состоянием корзины
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item => 
            item.id === action.payload.id 
              ? { ...item, quantity: item.quantity + 1 } 
              : item
          )
        };
      } else {
        return {
          ...state,
          items: [...state.items, { ...action.payload, quantity: 1 }]
        };
      }
    }
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };
      
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item => 
          item.id === action.payload.id 
            ? { ...item, quantity: action.payload.quantity } 
            : item
        )
      };
      
    case 'SET_ITEMS':
      return {
        ...state,
        items: action.payload
      };
      
    case 'CLEAR_CART':
      return { ...state, items: [] };
      
    default:
      return state;
  }
}

// Интерфейс для контекста корзины
interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  isInCart: (id: string) => boolean;
  clearCart: () => void;
}

// Создаем контекст с пустым значением по умолчанию
const CartContext = createContext<CartContextType>({
  cartItems: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  getTotalItems: () => 0,
  getTotalPrice: () => 0,
  isInCart: () => false,
  clearCart: () => {},
});

// Хук для использования контекста корзины
export const useCart = () => useContext(CartContext);

// Провайдер контекста корзины
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const localStorageKey = 'cart';
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(false);
  
  // Функция для проверки, является ли строка валидным ObjectId
  const isObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

  // Загружаем данные корзины из localStorage при монтировании компонента
  useEffect(() => {
    const storedCart = localStorage.getItem(localStorageKey);
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        // ВАЖНО: Фильтруем товары, оставляя только те, у которых валидный ObjectId
        const validItems = Array.isArray(parsedCart) 
          ? parsedCart.filter(item => item && item.id && isObjectId(item.id)) 
          : [];
        dispatch({ type: 'SET_ITEMS', payload: validItems });
      } catch (error) {
        console.error('Ошибка при чтении корзины из localStorage:', error);
        localStorage.removeItem(localStorageKey); // Очищаем в случае ошибки парсинга
      }
    }
    isMounted.current = true;
  }, []); // Пустой массив зависимостей, чтобы выполниться один раз
  
  // Функция для сохранения корзины с использованием debounce
  const saveToLocalStorage = useCallback((items: CartItem[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(items));
      } catch (error) {
        console.error('Ошибка при сохранении корзины в localStorage:', error);
      }
    }, 100); // Уменьшили задержку до 100 мс
  }, []);
  
  // Сохраняем корзину в localStorage при изменении cartItems
  useEffect(() => {
    if (isMounted.current) {
      saveToLocalStorage(state.items);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.items, saveToLocalStorage]);
  
  // Функция добавления товара в корзину
  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>) => {
    // Выполняем добавление сразу без requestAnimationFrame
    dispatch({ type: 'ADD_ITEM', payload: item });
  }, []);
  
  // Функция удаления товара из корзины
  const removeFromCart = useCallback((id: string) => {
    // Выполняем удаление сразу без requestAnimationFrame
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  }, []);
  
  // Функция обновления количества товара с batching
  const updateQuantity = useCallback((id: string, quantity: number) => {
    // Выполняем обновление сразу без requestAnimationFrame
    if (quantity <= 0) {
      dispatch({ type: 'REMOVE_ITEM', payload: id });
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
    }
  }, []);
  
  // Мемоизированные функции для вычисления данных корзины
  const getTotalItems = useCallback(() => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  }, [state.items]);
  
  const getTotalPrice = useCallback(() => {
    return state.items.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [state.items]);
  
  const isInCart = useCallback((id: string) => {
    return state.items.some(item => item.id === id);
  }, [state.items]);
  
  // Функция очистки корзины
  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);
  
  // Мемоизируем значение контекста для предотвращения лишних перерисовок
  const contextValue = useMemo(() => ({
    cartItems: state.items,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotalItems,
    getTotalPrice,
    isInCart,
    clearCart
  }), [
    state.items,
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    getTotalItems, 
    getTotalPrice, 
    isInCart,
    clearCart
  ]);
  
  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}; 