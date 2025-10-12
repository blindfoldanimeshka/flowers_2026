import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify, JWTPayload as JoseJWTPayload } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const key = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload extends JoseJWTPayload {
  userId: string;
  username: string;
  role: string;
}

// Создание JWT токена с использованием jose
export async function createToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

// Верификация JWT токена с использованием jose
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify<JWTPayload>(token, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // Ошибка будет возникать, если токен невалиден (истек, неверная подпись и т.д.)
    return null;
  }
}

// Установка cookie аутентификации
export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 час
  });
}

// Удаление cookie с токеном
export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.delete('auth_token');
  return response;
}

// Проверка прав администратора
export async function requireAdmin(request: NextRequest): Promise<{ success: boolean; user?: JWTPayload }> {
  try {
    // Получаем токен из cookie или заголовка
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

    // Верифицируем токен
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