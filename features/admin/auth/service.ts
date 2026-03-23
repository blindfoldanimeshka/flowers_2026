import { ILoginPayload, IUser } from '@/app/client/models/Auth';

function normalizeUserResponse(data: unknown): IUser | null {
  if (!data || typeof data !== 'object') return null;
  if ('user' in data && data.user && typeof data.user === 'object') return data.user as IUser;
  if ('username' in data && 'role' in data) return data as IUser;
  return null;
}

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function login(payload: ILoginPayload): Promise<IUser> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Не удалось выполнить вход'));
  const data = await response.json();
  const user = normalizeUserResponse(data);
  if (!user) throw new Error('Сервер вернул некорректные данные пользователя');
  return user;
}

export async function getCurrentUser(): Promise<IUser | null> {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(await parseError(response, 'Не удалось проверить авторизацию'));
  return normalizeUserResponse(await response.json());
}

export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  if (!response.ok) throw new Error(await parseError(response, 'Не удалось выполнить выход'));
}

