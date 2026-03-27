import { NextRequest, NextResponse } from 'next/server';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function setCsrfCookie(response: NextResponse, token: string) {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearCsrfCookie(response: NextResponse): NextResponse {
  response.cookies.delete(CSRF_COOKIE_NAME);
  return response;
}

export function isValidCsrfRequest(request: NextRequest): boolean {
  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME);

  if (!csrfCookie || !csrfHeader) return false;
  return csrfCookie === csrfHeader;
}

export function isTrustedOriginRequest(request: NextRequest): boolean {
  const normalizeOrigin = (value: string): string | null => {
    try {
      return new URL(value.trim()).origin;
    } catch {
      return null;
    }
  };

  const trustedOrigins = new Set<string>();

  const nextOrigin = normalizeOrigin(request.nextUrl.origin);
  if (nextOrigin) trustedOrigins.add(nextOrigin);

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host) {
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const currentProto = request.nextUrl.protocol.replace(':', '');
    const protos = new Set<string>(['http', 'https', currentProto]);
    if (forwardedProto) protos.add(forwardedProto);

    for (const proto of protos) {
      const origin = normalizeOrigin(`${proto}://${host}`);
      if (origin) trustedOrigins.add(origin);
    }
  }

  const configuredOrigins = process.env.ALLOWED_ORIGINS;
  if (configuredOrigins) {
    for (const item of configuredOrigins.split(',')) {
      const origin = normalizeOrigin(item);
      if (origin) trustedOrigins.add(origin);
    }
  }

  const originHeader = request.headers.get('origin');

  if (originHeader) {
    const actualOrigin = normalizeOrigin(originHeader);
    return Boolean(actualOrigin && trustedOrigins.has(actualOrigin));
  }

  const refererHeader = request.headers.get('referer');
  if (!refererHeader) {
    return false;
  }

  const refererOrigin = normalizeOrigin(refererHeader);
  return Boolean(refererOrigin && trustedOrigins.has(refererOrigin));
}
