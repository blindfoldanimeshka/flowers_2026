export const dynamic = 'force-dynamic';

import OrdersList from "./OrdersList";
import { cookies, headers } from 'next/headers';
import { getAdminOrders } from '@/features/admin/orders';

function normalizeBaseUrl(url: string) {
  return url.replace(/\/?api\/?$/, '').replace(/\/$/, '');
}

function getBaseUrlFromHeaders(headerStore: Headers) {
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  const protocol = headerStore.get('x-forwarded-proto') ?? 'https';

  if (host) {
    return `${protocol}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    return normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
}

async function getOrders() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieString = typeof cookieStore.toString === 'function' ? cookieStore.toString() : '';
  const baseUrl = getBaseUrlFromHeaders(headerStore);

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
    <div className="flex min-h-0 w-full max-w-full flex-1 flex-col bg-gray-100 px-1 py-2 sm:px-3 sm:py-4">
      <OrdersList initialOrders={plainOrders} />
    </div>
  );
}
