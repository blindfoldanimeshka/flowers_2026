'use client'

import React, { createContext, useContext, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  oldPrice?: number;
  imageSrc: string;
  quantity: number;
}

type CartAction = 
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'SET_ITEMS'; payload: CartItem[] }
  | { type: 'CLEAR_CART' };

interface CartState {
  items: CartItem[];
}

function normalizeId(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const normalizedId = normalizeId(action.payload.id);
      if (!normalizedId) return state;

      const existingItem = state.items.find((item) => item.id === normalizedId);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === normalizedId ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }

      return {
        ...state,
        items: [...state.items, { ...action.payload, id: normalizedId, quantity: 1 }],
      };
    }

    case 'REMOVE_ITEM': {
      const normalizedId = normalizeId(action.payload);
      return {
        ...state,
        items: state.items.filter((item) => item.id !== normalizedId),
      };
    }

    case 'UPDATE_QUANTITY': {
      const normalizedId = normalizeId(action.payload.id);
      if (!normalizedId) return state;

      return {
        ...state,
        items: state.items.map((item) =>
          item.id === normalizedId ? { ...item, quantity: action.payload.quantity } : item
        ),
      };
    }

    case 'SET_ITEMS':
      return {
        ...state,
        items: action.payload,
      };

    case 'CLEAR_CART':
      return { ...state, items: [] };

    default:
      return state;
  }
}

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

export const useCart = () => useContext(CartContext);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const localStorageKey = 'cart';
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    const storedCart = localStorage.getItem(localStorageKey);
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        const validItems = Array.isArray(parsedCart)
          ? parsedCart
              .map((item) => {
                const id = normalizeId(item?.id);
                if (
                  !item ||
                  !id ||
                  typeof item.title !== 'string' ||
                  typeof item.price !== 'number' ||
                  typeof item.quantity !== 'number' ||
                  item.quantity <= 0
                ) {
                  return null;
                }

                return {
                  ...item,
                  id,
                } as CartItem;
              })
              .filter((item): item is CartItem => Boolean(item))
          : [];

        dispatch({ type: 'SET_ITEMS', payload: validItems });
      } catch (error) {
        console.error('Ошибка при чтении корзины из localStorage:', error);
        localStorage.removeItem(localStorageKey);
      }
    }
    isMounted.current = true;
  }, []);

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
    }, 100);
  }, []);

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

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: normalizeId(id) });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    const normalizedId = normalizeId(id);
    if (!normalizedId) return;

    if (quantity <= 0) {
      dispatch({ type: 'REMOVE_ITEM', payload: normalizedId });
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id: normalizedId, quantity } });
    }
  }, []);

  const getTotalItems = useCallback(() => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  }, [state.items]);

  const getTotalPrice = useCallback(() => {
    return state.items.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [state.items]);

  const isInCart = useCallback((id: string) => {
    const normalizedId = normalizeId(id);
    return state.items.some((item) => item.id === normalizedId);
  }, [state.items]);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const contextValue = useMemo(() => ({
    cartItems: state.items,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotalItems,
    getTotalPrice,
    isInCart,
    clearCart,
  }), [
    state.items,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotalItems,
    getTotalPrice,
    isInCart,
    clearCart,
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};
