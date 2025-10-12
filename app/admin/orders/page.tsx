export const dynamic = 'force-dynamic';
import OrdersList from "./OrdersList";
import { cookies } from 'next/headers';

async function getOrders() {
  const cookieStore = await cookies();
  const cookieString = typeof cookieStore.toString === 'function' ? cookieStore.toString() : '';
  
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/?api\/?$/, '');
  const res = await fetch(`${baseUrl}/api/orders?limit=100`, {
    headers: {
      'Cookie': cookieString, // Передаем куки
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    // Для отладки можно посмотреть статус ответа
    console.error(`Failed to fetch orders with status: ${res.status}`);
    throw new Error('Не удалось загрузить заказы');
  }
  
  const data = await res.json();
  return data.orders || []; // Возвращаем именно массив заказов
}

export default async function OrdersPage() {
  const orders = await getOrders();
  // Теперь 'orders' это уже массив, дополнительная обработка не нужна
  const plainOrders = JSON.parse(JSON.stringify(orders));

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <OrdersList initialOrders={plainOrders} />
    </div>
  );
} 