'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useNewOrderNotifications } from '@/hooks/useNewOrderNotifications';
import { IAdminOrder } from '@/app/client/models/AdminOrder';
import { deleteAdminOrder, getAdminOrders, updateAdminOrderStatus } from './service';

type TabType = 'all' | 'delivery' | 'pickup';

const tabs: Array<{ id: TabType; label: string; icon: string; deliveryType?: 'delivery' | 'pickup' }> = [
  { id: 'all', label: 'Все заказы', icon: '📦' },
  { id: 'delivery', label: 'Доставка', icon: '🚚', deliveryType: 'delivery' },
  { id: 'pickup', label: 'Самовывоз', icon: '🏪', deliveryType: 'pickup' },
];

export const orderStatuses: Record<IAdminOrder['status'], string> = {
  pending: 'Ожидает',
  confirmed: 'Подтвержден',
  preparing: 'Готовится',
  delivering: 'Доставляется',
  delivered: 'Доставлен',
  cancelled: 'Отменен',
};

export function useAdminOrdersViewModel(initialOrders: IAdminOrder[]) {
  const [orders, setOrders] = useState<IAdminOrder[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<IAdminOrder | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    const currentTab = tabs.find(tab => tab.id === activeTab);
    return orders.filter(order => order.fulfillmentMethod === currentTab?.deliveryType);
  }, [activeTab, orders]);

  const handleNewOrder = useCallback((newOrder: IAdminOrder) => {
    setOrders(prevOrders => {
      const hasExisting = prevOrders.some(order => String(order._id) === String(newOrder._id));
      if (hasExisting) {
        return prevOrders.map(order => String(order._id) === String(newOrder._id) ? newOrder : order);
      }
      return [newOrder, ...prevOrders];
    });
  }, []);

  const currentTab = useMemo(() => tabs.find(tab => tab.id === activeTab), [activeTab]);

  const { isPolling, newOrdersCount } = useNewOrderNotifications({
    enabled: true,
    interval: 10000,
    deliveryType: currentTab?.deliveryType,
    onNewOrder: handleNewOrder,
  });

  useEffect(() => {
    let cancelled = false;

    const syncOrders = async () => {
      try {
        const freshOrders = await getAdminOrders({ limit: 100 });
        if (cancelled) return;
        setOrders(freshOrders);
        setSelectedOrder(prev => {
          if (!prev) return null;
          return freshOrders.find(order => String(order._id) === String(prev._id)) ?? null;
        });
      } catch {
        // Ошибки фоновой синхронизации не блокируют UI
      }
    };

    syncOrders();
    const timer = setInterval(syncOrders, 10000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const handleStatusChange = useCallback(async (id: string | number, status: IAdminOrder['status']) => {
    try {
      const updatedOrder = await updateAdminOrderStatus(id, status);
      setOrders(prev => prev.map(order => order._id === id ? updatedOrder : order));
      toast.success(`Статус заказа #${updatedOrder.orderNumber} обновлен`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при обновлении статуса заказа');
    }
  }, []);

  const handleDelete = useCallback(async (id: string | number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот заказ?')) return;
    try {
      await deleteAdminOrder(id);
      setOrders(prev => prev.filter(order => order._id !== id));
      setSelectedOrder(prev => prev?._id === id ? null : prev);
      toast.success('Заказ успешно удален');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при удалении заказа');
    }
  }, []);

  return {
    filteredOrders,
    selectedOrder,
    activeTab,
    setActiveTab,
    tabs,
    currentTab,
    isPolling,
    newOrdersCount,
    orderCounts: {
      all: orders.length,
      delivery: orders.filter(order => order.fulfillmentMethod === 'delivery').length,
      pickup: orders.filter(order => order.fulfillmentMethod === 'pickup').length,
    },
    handleStatusChange,
    handleDelete,
    handleShowDetails: (order: IAdminOrder) => setSelectedOrder(order),
    handleCloseDetails: () => setSelectedOrder(null),
  };
}
