import { NextRequest, NextResponse } from 'next/server';
import { isTrustedOriginRequest, isValidCsrfRequest, clearCsrfCookie } from '@/lib/csrf';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

export const POST = withErrorHandler(async (request: NextRequest) => {
    if (!isTrustedOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    if (!isValidCsrfRequest(request)) {
      return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 });
    }

    const response = NextResponse.json({ message: 'Logout successful' });

    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
    clearCsrfCookie(response);

    return response;
  
});
