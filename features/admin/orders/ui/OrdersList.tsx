'use client';

import { format } from 'date-fns';
import Image from 'next/image';
import { useEffect, useId } from 'react';
import { IAdminOrder, orderStatuses, useAdminOrdersViewModel } from '@/features/admin/orders';

interface OrdersListProps {
  initialOrders: IAdminOrder[];
}

export default function OrdersList({ initialOrders }: OrdersListProps) {
  const vm = useAdminOrdersViewModel(initialOrders);
  const {
    filteredOrders,
    selectedOrder,
    activeTab,
    setActiveTab,
    tabs,
    currentTab,
    isPolling,
    newOrdersCount,
    highlightNewOrderIds,
    orderCounts,
    handleStatusChange,
    handleDelete,
    handleShowDetails,
    handleCloseDetails,
  } = vm;

  const modalTitleId = useId();
  const modalDescriptionId = useId();

  useEffect(() => {
    if (!selectedOrder) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseDetails();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedOrder, handleCloseDetails]);

  return (
    <div className="w-full max-w-none rounded-2xl border border-gray-100 bg-white p-3 shadow-xl sm:p-5 lg:p-6">
      <div className="mb-4 sm:mb-8 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-gray-800">Управление заказами</h2>
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className={`h-3 w-3 rounded-full ${isPolling ? 'animate-pulse bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-gray-600">{isPolling ? 'Online' : 'Offline'}</span>
          </div>
          {newOrdersCount > 0 && <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">+{newOrdersCount} новых</div>}
        </div>
      </div>

      <div className="mb-4 shrink-0 sm:mb-6">
        <div className="overflow-x-auto border-b border-gray-200">
          <nav className="-mb-px flex space-x-2 sm:space-x-8 min-w-max" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{orderCounts[tab.id]}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className={selectedOrder ? 'overflow-hidden' : ''}>
        <div className="grid grid-cols-2 gap-2.5 md:hidden [touch-action:pan-y]">
          {filteredOrders.length === 0 ? (
            <div className="col-span-2 p-8 text-center text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl">{currentTab?.icon || '📦'}</span>
                <span>Заказов нет</span>
              </div>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isNewHighlight = highlightNewOrderIds.has(String(order._id));
              const previewImage =
                order.items.find((item) => typeof item.image === 'string' && item.image.trim().length > 0)?.image ||
                '/image/items/11.png';
              const statusLabel = orderStatuses[order.status];

              return (
                <div
                  key={order._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleShowDetails(order)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleShowDetails(order);
                    }
                  }}
                  className={`relative min-h-[170px] w-full overflow-hidden rounded-lg border text-left shadow-sm transition ${
                    isNewHighlight ? 'border-emerald-300' : 'border-gray-200'
                  } [touch-action:manipulation]`}
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.72) 74%), url('${previewImage}')`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                  }}
                >
                  <div className="flex h-full flex-col justify-between p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {isNewHighlight && (
                          <span className="mb-1 inline-flex rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Новый
                          </span>
                        )}
                        <p className="truncate font-mono text-[11px] font-semibold text-white">{order.orderNumber}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          order.fulfillmentMethod === 'delivery'
                            ? 'bg-blue-100/90 text-blue-800'
                            : 'bg-green-100/90 text-green-800'
                        }`}
                      >
                        {order.fulfillmentMethod === 'delivery' ? 'Доставка' : 'Самовывоз'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{order.customer.name}</p>
                      <p className="truncate text-[11px] text-white/80">{order.customer.phone}</p>
                      <div className="mt-1 flex items-end justify-between gap-2">
                        <span className="text-sm font-bold text-white">{order.totalAmount} ₽</span>
                        <span className="max-w-[48%] truncate rounded bg-black/35 px-1.5 py-0.5 text-[10px] text-white/95">
                          {statusLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-white/75">{format(new Date(order.createdAt), 'dd.MM HH:mm')}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <table className="hidden w-full border-separate md:table" style={{ borderSpacing: '0 0.5rem' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100 text-sm uppercase text-gray-600 shadow-sm">
              <th className="rounded-l-xl p-3">Номер</th>
              <th className="p-3">Клиент</th>
              <th className="p-3">Телефон</th>
              <th className="p-3">Товары</th>
              <th className="p-3">Получение</th>
              <th className="p-3">Сумма</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Дата</th>
              <th className="rounded-r-xl p-3">Действия</th>
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
              filteredOrders.map((order) => {
                const isNewHighlight = highlightNewOrderIds.has(String(order._id));
                const cellBg = isNewHighlight ? 'bg-emerald-50' : 'bg-white';
                const cellBorder = isNewHighlight ? 'border-emerald-300' : 'border-gray-200';

                return (
                  <tr key={order._id} className="shadow-md transition-shadow hover:shadow-lg">
                    <td className={`rounded-l-xl border-b border-l border-t p-3 ${cellBorder} ${cellBg}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        {isNewHighlight && (
                          <span className="shrink-0 rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Новый</span>
                        )}
                        <span className="font-mono text-sm text-blue-600">{order.orderNumber}</span>
                      </div>
                    </td>
                    <td className={`border-b border-t p-3 ${cellBorder} ${cellBg}`}>
                      <div>
                        <div className="font-semibold text-gray-900">{order.customer.name}</div>
                        <div className="text-sm text-gray-500">{order.customer.email}</div>
                      </div>
                    </td>
                    <td className={`border-b border-t p-3 text-gray-700 ${cellBorder} ${cellBg}`}>{order.customer.phone}</td>
                    <td className={`border-b border-t p-3 ${cellBorder} ${cellBg}`}>
                      <div className="space-y-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="text-sm">
                            <span className="text-gray-900">{item.name}</span>
                            <span className="ml-2 font-medium text-gray-500">x{item.quantity}</span>
                            {index < order.items.length - 1 && <span className="text-gray-400">,</span>}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className={`border-b border-t p-3 ${cellBorder} ${cellBg}`}>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          order.fulfillmentMethod === 'delivery' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {order.fulfillmentMethod === 'delivery' ? '🚚 Доставка' : '🏪 Самовывоз'}
                      </span>
                    </td>
                    <td className={`border-b border-t p-3 font-semibold text-gray-900 ${cellBorder} ${cellBg}`}>{order.totalAmount} ₽</td>
                    <td className={`border-b border-t p-3 ${cellBorder} ${cellBg}`}>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order._id, e.target.value as IAdminOrder['status'])}
                        className={`rounded-full border-0 px-3 py-1 text-xs font-medium focus:ring-2 focus:ring-blue-200 ${
                          order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : order.status === 'confirmed'
                              ? 'bg-blue-100 text-blue-800'
                              : order.status === 'preparing'
                                ? 'bg-purple-100 text-purple-800'
                                : order.status === 'delivering'
                                  ? 'bg-orange-100 text-orange-800'
                                  : order.status === 'delivered'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {Object.entries(orderStatuses).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={`border-b border-t p-3 text-sm text-gray-600 ${cellBorder} ${cellBg}`}>{format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}</td>
                    <td className={`rounded-r-xl border-b border-r border-t p-3 ${cellBorder} ${cellBg}`}>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleShowDetails(order)}
                          className="rounded bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600"
                        >
                          Детали
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(order._id)}
                          className="rounded bg-red-500 px-3 py-1 text-sm text-white transition-colors hover:bg-red-600"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 p-2 pt-3 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={handleCloseDetails} aria-hidden="true">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            aria-describedby={modalDescriptionId}
            className="mx-1 max-h-[95vh] w-full max-w-6xl overflow-y-auto overscroll-contain touch-pan-y rounded-2xl bg-white p-4 shadow-2xl sm:mx-4 sm:max-h-[92vh] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-4 pb-3 pt-1 sm:-mx-6 sm:px-6">
              <h3 id={modalTitleId} className="text-xl font-bold">
                Детали заказа #{selectedOrder.orderNumber}
              </h3>
              <button
                type="button"
                onClick={handleCloseDetails}
                className="rounded-md p-2 text-2xl leading-none text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Закрыть модальное окно"
              >
                ×
              </button>
            </div>

            <div id={modalDescriptionId} className="grid gap-4 text-sm sm:grid-cols-2 sm:text-base">
              <div className="break-words"><strong>Клиент:</strong> {selectedOrder.customer.name}</div>
              <div className="break-words"><strong>Email:</strong> {selectedOrder.customer.email || 'Не указан'}</div>
              <div className="break-words"><strong>Телефон:</strong> {selectedOrder.customer.phone}</div>
              <div className="break-words"><strong>Адрес:</strong> {selectedOrder.customer.address || 'Не указан'}</div>
              <div className="break-words"><strong>Общая сумма:</strong> {selectedOrder.totalAmount} ₽</div>
              <div className="break-words"><strong>Способ получения:</strong> {selectedOrder.fulfillmentMethod === 'delivery' ? '🚚 Доставка' : '🏪 Самовывоз'}</div>
              <div className="sm:col-span-2">
                <div className="mb-1 font-semibold">Статус заказа</div>
                <select
                  value={selectedOrder.status}
                  onChange={(event) => handleStatusChange(selectedOrder._id, event.target.value as IAdminOrder['status'])}
                  className={`w-full rounded-lg px-3 py-2 text-sm font-medium outline-none ring-1 ring-inset focus:ring-2 focus:ring-blue-200 sm:text-base ${
                    selectedOrder.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 ring-yellow-200'
                      : selectedOrder.status === 'confirmed'
                        ? 'bg-blue-100 text-blue-800 ring-blue-200'
                        : selectedOrder.status === 'preparing'
                          ? 'bg-purple-100 text-purple-800 ring-purple-200'
                          : selectedOrder.status === 'delivering'
                            ? 'bg-orange-100 text-orange-800 ring-orange-200'
                            : selectedOrder.status === 'delivered'
                              ? 'bg-green-100 text-green-800 ring-green-200'
                              : 'bg-red-100 text-red-800 ring-red-200'
                  }`}
                >
                  {Object.entries(orderStatuses).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {selectedOrder.notes && <div className="break-words"><strong>Примечания:</strong> {selectedOrder.notes}</div>}
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <h4 className="mb-3 text-base font-semibold sm:text-lg">Товары</h4>
              <ul className="space-y-3">
                {selectedOrder.items.map((item, index) => (
                  <li key={index} className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 md:flex-row md:items-start">
                    <div className="aspect-square w-full max-w-[320px] overflow-hidden rounded-xl border border-gray-200 bg-white sm:max-w-[380px] md:w-[min(40vw,420px)] md:max-w-none">
                      <Image
                        src={item.image || '/image/items/11.png'}
                        alt={item.name}
                        width={640}
                        height={640}
                        unoptimized
                        className="h-full w-full object-cover"
                        loading="lazy"
                        sizes="(max-width: 768px) 92vw, 640px"
                        onError={(event) => {
                          const target = event.currentTarget as HTMLImageElement;
                          target.src = '/image/items/11.png';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="break-words text-base font-semibold text-gray-900">{item.name}</div>
                      <div className="mt-1 text-sm text-gray-600">
                        {item.quantity} шт. x {item.price} ₽
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
