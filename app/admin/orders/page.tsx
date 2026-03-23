export const dynamic = 'force-dynamic';

import OrdersList from "./OrdersList";
import { cookies } from 'next/headers';
import { getAdminOrders } from '@/features/admin/orders';

async function getOrders() {
  const cookieStore = await cookies();
  const cookieString = typeof cookieStore.toString === 'function' ? cookieStore.toString() : '';
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/?api\/?$/, '');

  return getAdminOrders({
    baseUrl,
    cookieHeader: cookieString,
    limit: 100,
  });
}

export default async function OrdersPage() {
  const orders = await getOrders();
  const plainOrders = JSON.parse(JSON.stringify(orders));

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <OrdersList initialOrders={plainOrders} />
    </div>
  );
}

