import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfToken(): string {
  return getCookie(CSRF_COOKIE_NAME) || '';
}

export function withCsrfHeaders(headers: HeadersInit = {}): HeadersInit {
  const token = getCsrfToken();
  if (!token) return headers;

  if (headers instanceof Headers) {
    headers.set(CSRF_HEADER_NAME, token);
    return headers;
  }

  if (Array.isArray(headers)) {
    return [...headers, [CSRF_HEADER_NAME, token]];
  }

  return { ...headers, [CSRF_HEADER_NAME]: token };
}
