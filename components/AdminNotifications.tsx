"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useNewOrderNotifications } from '@/hooks/useNewOrderNotifications';

interface AdminNotificationsProps {
  onNewOrder?: (order: any) => void;
  pollingInterval?: number;
}

export default function AdminNotifications({
  onNewOrder,
  pollingInterval = 30000,
}: AdminNotificationsProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;
  const { isAdmin, isLoading: authLoading } = useAuth(isAdminRoute);

  const { isPolling, error, newOrdersCount } = useNewOrderNotifications({
    enabled: isAdminRoute && isAdmin && !authLoading,
    interval: pollingInterval,
    onNewOrder,
  });

  if (process.env.NODE_ENV === 'development' && isAdminRoute && isAdmin) {
    return (
      <div className="fixed bottom-4 left-4 bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-xs z-50">
        <div>Notifications: {isPolling ? 'active' : 'disabled'}</div>
        <div>New orders: {newOrdersCount}</div>
        {error && <div className="text-red-600">Error: {error}</div>}
      </div>
    );
  }

  return null;
}

