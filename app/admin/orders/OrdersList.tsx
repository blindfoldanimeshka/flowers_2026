"use client";
import React, { useState, useCallback, useMemo } from "react";
import { format } from 'date-fns';
import { useNewOrderNotifications } from '@/hooks/useNewOrderNotifications';
import { toast } from 'react-toastify';
import type { Order } from '../types';

const statuses = {
  pending: "Ожидает",
  confirmed: "Подтвержден",
  preparing: "Готовится",
  delivering: "Доставляется",
  delivered: "Доставлен",
  cancelled: "Отменен",
};

// Типы вкладок
type TabType = 'all' | 'delivery' | 'pickup';

interface Tab {
  id: TabType;
  label: string;
  icon: string;
  deliveryType?: string;
}

const tabs: Tab[] = [
  { id: 'all', label: 'Все заказы', icon: '📦' },
  { id: 'delivery', label: 'Доставка', icon: '🚚', deliveryType: 'delivery' },
  { id: 'pickup', label: 'Самовывоз', icon: '🏪', deliveryType: 'pickup' },
];

interface OrdersListProps {
  initialOrders: Order[];
}

export default function OrdersList({ initialOrders }: OrdersListProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  
  // Фильтруем заказы по активной вкладке
  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') {
      return orders;
    }
    const currentTab = tabs.find(tab => tab.id === activeTab);
    return orders.filter(order => order.fulfillmentMethod === currentTab?.deliveryType);
  }, [orders, activeTab]);

  // Callback для обработки новых заказов
  const handleNewOrder = useCallback((newOrder: Order) => {
    console.log('Получен новый заказ:', newOrder);
    
    // Добавляем новый заказ в начало списка
    setOrders((prevOrders: Order[]) => [newOrder, ...prevOrders]);
    
    // Дополнительное уведомление в консоль для отладки
    console.log(`Новый заказ #${newOrder.orderNumber} добавлен в список`);
  }, []);

  // Получаем текущую вкладку для фильтрации
  const currentTab = tabs.find(tab => tab.id === activeTab);

  // Используем hook для real-time уведомлений с фильтрацией по типу доставки
  const { isPolling, newOrdersCount } = useNewOrderNotifications({
    enabled: true, // Всегда включено на странице заказов
    interval: 15000, // Проверяем каждые 15 секунд для более быстрого обновления
    deliveryType: currentTab?.deliveryType, // Фильтруем уведомления по активной вкладке
    onNewOrder: handleNewOrder,
  });

  // Функции handleStatusChange и handleDelete
  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/orders`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ _id: id, status }),
      });
      
      if (res.ok) {
        const { order } = await res.json();
        setOrders(orders.map((o: Order) => o._id === id ? order : o));
        toast.success(`Статус заказа #${order.orderNumber} обновлен`);
      } else {
        const errorData = await res.json();
        toast.error(`Ошибка: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      toast.error('Ошибка при обновлении статуса заказа');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот заказ?')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setOrders(orders.filter(order => order._id !== id));
        if (selectedOrder && selectedOrder._id === id) setSelectedOrder(null);
        toast.success('Заказ успешно удален');
      } else {
        const errorData = await res.json();
        toast.error(`Ошибка: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении заказа:', error);
      toast.error('Ошибка при удалении заказа');
    }
  };

  const handleShowDetails = (order: Order) => setSelectedOrder(order);
  const handleCloseDetails = () => setSelectedOrder(null);

  // Подсчет заказов по типам
  const orderCounts = useMemo(() => {
    return {
      all: orders.length,
      delivery: orders.filter((order: Order) => order.fulfillmentMethod === 'delivery').length,
      pickup: orders.filter((order: Order) => order.fulfillmentMethod === 'pickup').length,
    };
  }, [orders]);

  return (
    <div className="p-8 bg-white rounded-2xl shadow-xl max-w-7xl mx-auto border border-gray-100">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-800">Управление заказами</h2>
        <div className="flex items-center gap-4">
          {/* Индикатор real-time статуса */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${isPolling ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-gray-600">
              {isPolling ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {/* Счетчик новых заказов */}
          {newOrdersCount > 0 && (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              +{newOrdersCount} новых
            </div>
          )}
        </div>
      </div>

      {/* Вкладки */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs font-medium">
                    {orderCounts[tab.id]}
                  </span>
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: '0 0.5rem' }}>
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-sm">
              <th className="p-3 rounded-l-xl">Номер</th>
              <th className="p-3">Клиент</th>
              <th className="p-3">Телефон</th>
              <th className="p-3">Товары</th>
              <th className="p-3">Получение</th>
              <th className="p-3">Сумма</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Дата</th>
              <th className="p-3 rounded-r-xl">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">{currentTab?.icon || '📦'}</span>
                    <span>Заказов нет</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order: Order) => (
                <tr key={order._id} className="bg-white shadow-md hover:shadow-lg transition-shadow">
                  <td className="p-3 rounded-l-xl border-l border-t border-b border-gray-200">
                    <span className="font-mono text-sm text-blue-600">
                      {order.orderNumber}
                    </span>
                  </td>
                  <td className="p-3 border-t border-b border-gray-200">
                    <div>
                      <div className="font-semibold text-gray-900">{order.customer.name}</div>
                      <div className="text-sm text-gray-500">{order.customer.email}</div>
                    </div>
                  </td>
                  <td className="p-3 border-t border-b border-gray-200 text-gray-700">
                    {order.customer.phone}
                  </td>
                  <td className="p-3 border-t border-b border-gray-200">
                    <div className="space-y-1">
                      {order.items.map((item: Order['items'][0], index: number) => (
                        <div key={index} className="text-sm">
                          <span className="text-gray-900">{item.name}</span>
                          <span className="ml-2 text-gray-500 font-medium">x{item.quantity}</span>
                          {index < order.items.length - 1 && <span className="text-gray-400">,</span>}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 border-t border-b border-gray-200">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.fulfillmentMethod === 'delivery' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {order.fulfillmentMethod === 'delivery' ? '🚚 Доставка' : '🏪 Самовывоз'}
                    </span>
                  </td>
                  <td className="p-3 border-t border-b border-gray-200 font-semibold text-gray-900">
                    {order.totalAmount} ₽
                  </td>
                  <td className="p-3 border-t border-b border-gray-200">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order._id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border-0 focus:ring-2 focus:ring-blue-200 ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'preparing' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'delivering' ? 'bg-orange-100 text-orange-800' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {Object.entries(statuses).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 border-t border-b border-gray-200 text-sm text-gray-600">
                    {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}
                  </td>
                  <td className="p-3 rounded-r-xl border-r border-t border-b border-gray-200">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleShowDetails(order)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                      >
                        Детали
                      </button>
                      <button
                        onClick={() => handleDelete(order._id)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Модальное окно с деталями заказа */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Детали заказа #{selectedOrder.orderNumber}</h3>
              <button 
                onClick={handleCloseDetails}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <strong>Клиент:</strong> {selectedOrder.customer.name}
              </div>
              <div>
                <strong>Email:</strong> {selectedOrder.customer.email}
              </div>
              <div>
                <strong>Телефон:</strong> {selectedOrder.customer.phone}
              </div>
              <div>
                <strong>Адрес:</strong> {selectedOrder.customer.address || 'Не указан'}
              </div>
              <div>
                <strong>Товары:</strong>
                <ul className="mt-2 space-y-1">
                  {selectedOrder.items.map((item, index) => (
                    <li key={index} className="ml-4 text-sm">
                      • {item.name} - {item.quantity} шт. по {item.price} ₽
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Общая сумма:</strong> {selectedOrder.totalAmount} ₽
              </div>
              <div>
                <strong>Способ получения:</strong> {selectedOrder.fulfillmentMethod === 'delivery' ? '🚚 Доставка' : '🏪 Самовывоз'}
              </div>
              <div>
                <strong>Статус:</strong> {statuses[selectedOrder.status]}
              </div>
              {selectedOrder.notes && (
                <div>
                  <strong>Примечания:</strong> {selectedOrder.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 