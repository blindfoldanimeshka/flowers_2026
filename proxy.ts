import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isTrustedOriginRequest, isValidCsrfRequest } from '@/lib/csrf';
import { productionLogger } from '@/lib/productionLogger';

const AUTH_LOGIN_PATH = '/auth/login';
const ADMIN_DASHBOARD_PATH = '/admin/orders';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const mirrorMode = process.env.MIRROR_MODE === 'true';
  const isMutatingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
  const mirrorMutationAllowlist = (process.env.MIRROR_MUTATION_ALLOWLIST || '/api/auth')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  let token = request.cookies.get('auth_token')?.value;

  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  const payload = token ? await verifyToken(token) : null;
  const isAuthenticated = !!payload;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  const isMirrorAllowedMutation = mirrorMutationAllowlist.some((prefix) => pathname.startsWith(prefix));

  if (mirrorMode && pathname.startsWith('/api/') && isMutatingRequest && !isMirrorAllowedMutation) {
    return NextResponse.json(
      {
        error: 'Mirror mode is enabled. This mutating endpoint is blocked in local environment.',
      },
      { status: 403 }
    );
  }

  if (pathname === AUTH_LOGIN_PATH) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(ADMIN_DASHBOARD_PATH, request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated || payload?.role !== 'admin') {
      const response = NextResponse.redirect(new URL(AUTH_LOGIN_PATH, request.url));
      response.cookies.delete('auth_token');
      return response;
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    const isPublicApiRoute =
      (
        request.method === 'GET' && (
          pathname.startsWith('/api/products') ||
          pathname.startsWith('/api/categories') ||
          pathname.startsWith('/api/subcategories') ||
          pathname.startsWith('/api/settings')
        )
      ) ||
      (request.method === 'POST' && pathname.startsWith('/api/orders'));

    if (isPublicApiRoute) {
      return NextResponse.next();
    }

    if (!isAuthenticated || payload?.role !== 'admin') {
      const errorResponse = !isAuthenticated
        ? { error: 'Требуется аутентификация' }
        : { error: 'Доступ запрещен. Требуются права администратора.' };
      const status = !isAuthenticated ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const hasAuthCookie = Boolean(request.cookies.get('auth_token')?.value);
    const hasBearerToken = Boolean(request.headers.get('authorization')?.startsWith('Bearer '));

    if (isMutatingRequest) {
      if (hasAuthCookie) {
        if (!isTrustedOriginRequest(request)) {
          productionLogger.warn('Blocked request: invalid origin (cookie auth)', {
            origin: request.headers.get('origin'),
            referer: request.headers.get('referer'),
            path: request.nextUrl.pathname,
            method: request.method,
          });
          return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
        }

        if (!isValidCsrfRequest(request)) {
          productionLogger.warn('Blocked request: CSRF token mismatch', {
            path: request.nextUrl.pathname,
            method: request.method,
          });
          return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 });
        }
      } else if (hasBearerToken) {
        if (!isTrustedOriginRequest(request)) {
          productionLogger.warn('Blocked request: invalid origin (Bearer token)', {
            origin: request.headers.get('origin'),
            referer: request.headers.get('referer'),
            path: request.nextUrl.pathname,
            method: request.method,
          });
          return NextResponse.json(
            { error: 'Invalid request origin. Bearer tokens can only be used from trusted domains.' },
            { status: 403 }
          );
        }
      }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);
    requestHeaders.set('x-username', payload.username);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*', '/auth/login'],
};

