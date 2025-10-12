"use client";
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNewOrderNotifications } from '@/hooks/useNewOrderNotifications';

interface AdminNotificationsProps {
  onNewOrder?: (order: any) => void;
  pollingInterval?: number;
}

export default function AdminNotifications({ 
  onNewOrder, 
  pollingInterval = 30000 
}: AdminNotificationsProps) {
  const { isAdmin, isLoading: authLoading } = useAuth();

  const {
    isPolling,
    error,
    newOrdersCount,
  } = useNewOrderNotifications({
    enabled: isAdmin && !authLoading, // Включаем только для админов
    interval: pollingInterval,
    onNewOrder,
  });

  // Компонент не рендерит UI, только обрабатывает уведомления
  // Можно добавить индикатор статуса polling для отладки
  if (process.env.NODE_ENV === 'development' && isAdmin) {
    return (
      <div className="fixed bottom-4 left-4 bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-xs z-50">
        <div>🔔 Уведомления: {isPolling ? '✅ Активны' : '❌ Отключены'}</div>
        <div>📊 Новых заказов: {newOrdersCount}</div>
        {error && <div className="text-red-600">❌ Ошибка: {error}</div>}
      </div>
    );
  }

  return null;
} 