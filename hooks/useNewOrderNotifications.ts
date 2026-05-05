import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { productionLogger } from '@/lib/productionLogger';

interface NewOrder {
  _id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'cash' | 'card' | 'online';
  fulfillmentMethod: 'delivery' | 'pickup';
  createdAt: string;
  updatedAt: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    image: string;
  }>;
  notes?: string;
}

interface UseNewOrderNotificationsProps {
  enabled?: boolean;
  interval?: number; // Интервал polling в миллисекундах
  deliveryType?: string; // Фильтр по типу доставки: 'delivery' или 'pickup'
  onNewOrder?: (order: NewOrder) => void; // Callback для новых заказов
}

interface UseNewOrderNotificationsReturn {
  isPolling: boolean;
  error: string | null;
  newOrdersCount: number;
  startPolling: () => void;
  stopPolling: () => void;
}

export function useNewOrderNotifications({
  enabled = true,
  interval = 30000, // 30 секунд по умолчанию
  deliveryType,
  onNewOrder
}: UseNewOrderNotificationsProps = {}): UseNewOrderNotificationsReturn {
  const MAX_BACKOFF_MS = 5 * 60 * 1000;
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const isRequestInFlightRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);
  const nextAllowedRequestAtRef = useRef(0);

  const getBackoffDelay = useCallback((failureCount: number) => {
    const exponent = Math.max(0, failureCount - 1);
    return Math.min(interval * Math.pow(2, exponent), MAX_BACKOFF_MS);
  }, [interval]);

  const checkForNewOrders = useCallback(async () => {
    if (isRequestInFlightRef.current) {
      return;
    }

    const now = Date.now();
    if (now < nextAllowedRequestAtRef.current) {
      return;
    }

    isRequestInFlightRef.current = true;
    try {
      setError(null);
      
      // Формируем URL с параметрами фильтрации
      const params = new URLSearchParams({
        since: lastCheckRef.current
      });
      
      if (deliveryType) {
        params.append('deliveryType', deliveryType);
      }
      
      const response = await fetch(`/api/orders/latest?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Если получили 403, значит пользователь не админ - останавливаем polling
        if (response.status === 403) {
          setIsPolling(false);
          consecutiveFailuresRef.current = 0;
          nextAllowedRequestAtRef.current = 0;
          return;
        }
        // Для временных серверных ошибок polling не должен ломать UX
        if (response.status >= 500) {
          consecutiveFailuresRef.current += 1;
          const backoffMs = getBackoffDelay(consecutiveFailuresRef.current);
          nextAllowedRequestAtRef.current = Date.now() + backoffMs;
          setError(`Временная ошибка сервера уведомлений. Повторим через ${Math.ceil(backoffMs / 1000)} сек.`);
          return;
        }

        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // ignore json parse errors for non-JSON responses
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      consecutiveFailuresRef.current = 0;
      nextAllowedRequestAtRef.current = 0;
      
      // Обновляем timestamp последней проверки
      lastCheckRef.current = data.timestamp;

      // Если есть новые заказы
      if (data.count > 0 && data.orders.length > 0) {
        setNewOrdersCount(prev => prev + data.count);
        
        // Показываем уведомления для каждого нового заказа
        data.orders.forEach((order: NewOrder) => {
          const itemsText = order.items
            .map(item => `${item.name} x${item.quantity}`)
            .join(', ');
          
          const deliveryEmoji = order.fulfillmentMethod === 'delivery' ? '🚚' : '🏪';
          const deliveryText = order.fulfillmentMethod === 'delivery' ? 'Доставка' : 'Самовывоз';
          
          toast.success(
            `🛒 Новый заказ #${order.orderNumber}!\n👤 ${order.customer.name}\n📦 ${itemsText}\n${deliveryEmoji} ${deliveryText}\n💰 ${order.totalAmount} ₽`,
            {
              position: "top-right",
              autoClose: 8000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            }
          );

          // Вызываем callback если передан
          if (onNewOrder) {
            onNewOrder(order);
          }
        });
      }
    } catch (err: any) {
      productionLogger.error('Ошибка при проверке новых заказов:', err);
      consecutiveFailuresRef.current += 1;
      const backoffMs = getBackoffDelay(consecutiveFailuresRef.current);
      nextAllowedRequestAtRef.current = Date.now() + backoffMs;
      setError(`${err.message}. Повторим через ${Math.ceil(backoffMs / 1000)} сек.`);
    } finally {
      isRequestInFlightRef.current = false;
    }
  }, [onNewOrder, deliveryType, getBackoffDelay]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    consecutiveFailuresRef.current = 0;
    nextAllowedRequestAtRef.current = 0;
    setIsPolling(true);
    setError(null);
    
    // Сразу проверяем при старте
    checkForNewOrders();
    
    // Устанавливаем интервал
    intervalRef.current = setInterval(checkForNewOrders, interval);
  }, [checkForNewOrders, interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    consecutiveFailuresRef.current = 0;
    nextAllowedRequestAtRef.current = 0;
    isRequestInFlightRef.current = false;
    setIsPolling(false);
  }, []);

  // Автоматический старт/стоп при изменении enabled
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    // Cleanup при размонтировании
    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  // Cleanup при размонтировании компонента
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isPolling,
    error,
    newOrdersCount,
    startPolling,
    stopPolling,
  };
} 