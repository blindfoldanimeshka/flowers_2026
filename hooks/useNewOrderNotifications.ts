import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';

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
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<string>(new Date().toISOString());

  const checkForNewOrders = useCallback(async () => {
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
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
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
      console.error('Ошибка при проверке новых заказов:', err);
      setError(err.message);
    }
  }, [onNewOrder, deliveryType]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
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