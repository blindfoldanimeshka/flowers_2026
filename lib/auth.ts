import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify, JWTPayload as JoseJWTPayload } from 'jose';

function getJwtKey() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET (or NEXTAUTH_SECRET) is not set');
  }

  return new TextEncoder().encode(secret);
}

export interface JWTPayload extends JoseJWTPayload {
  userId: string;
  username: string;
  role: string;
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtKey());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify<JWTPayload>(token, getJwtKey(), {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'JWT_SECRET (or NEXTAUTH_SECRET) is not set' || error.message === 'JWT_SECRET is not set')
    ) {
      console.error('JWT verification is unavailable because JWT secret is not configured');
    }
    return null;
  }
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  });
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.delete('auth_token');
  return response;
}

export async function requireAdmin(request: NextRequest): Promise<{ success: boolean; user?: JWTPayload }> {
  try {
    let token = request.cookies.get('auth_token')?.value;

    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return { success: false };
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return { success: false };
    }

    return { success: true, user: payload };
  } catch (error) {
    console.error('Ошибка при проверке прав администратора:', error);
    return { success: false };
  }
}
