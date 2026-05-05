import { IAdminOrder } from '@/app/client/models/AdminOrder';
import { withCsrfHeaders } from '@/lib/csrf-client';

interface GetAdminOrdersOptions {
  baseUrl?: string;
  cookieHeader?: string;
  limit?: number;
}

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function getAdminOrders(options: GetAdminOrdersOptions = {}): Promise<IAdminOrder[]> {
  const { baseUrl = '', cookieHeader, limit = 100 } = options;
  const response = await fetch(`${baseUrl}/api/orders?limit=${limit}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await parseError(response, 'Не удалось загрузить заказы'));
  const data = await response.json();
  return data.orders || [];
}

export async function updateAdminOrderStatus(id: string | number, status: IAdminOrder['status']): Promise<IAdminOrder> {
  const response = await fetch('/api/orders', {
    method: 'PUT',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ _id: String(id), status }),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Не удалось обновить статус заказа'));
  const data = await response.json();
  return data.order;
}

export async function deleteAdminOrder(id: string | number): Promise<void> {
  const response = await fetch(`/api/orders/${String(id)}`, {
    method: 'DELETE',
    headers: withCsrfHeaders(),
    credentials: 'include',
  });
  if (!response.ok) throw new Error(await parseError(response, 'Не удалось удалить заказ'));
}
