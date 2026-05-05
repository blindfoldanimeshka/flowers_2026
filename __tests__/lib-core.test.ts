import { NextResponse } from 'next/server';

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    headers: Headers;

    constructor(_body: unknown = null, init: { status?: number } = {}) {
      this.status = init.status ?? 200;
      this.headers = new Headers();
    }
  }

  return { NextResponse: MockNextResponse };
});

jest.mock('@/lib/csrf', () => ({
  CSRF_COOKIE_NAME: 'csrf_token',
  CSRF_HEADER_NAME: 'x-csrf-token',
}));

import { addCorsHeaders, corsMiddleware } from '../lib/cors';
import { CSRF_HEADER_NAME } from '../lib/csrf';
import { getCsrfToken, withCsrfHeaders } from '../lib/csrf-client';
import { isValidId } from '../lib/id';
import Logger, { apiLogger } from '../lib/logger';
import { escapeRegExp, safeSearchTerm, sanitizeMongoObject, toIntInRange } from '../lib/security';

describe('lib core utilities', () => {
  describe('id', () => {
    it('validates non-empty strings only', () => {
      expect(isValidId('abc')).toBe(true);
      expect(isValidId('  abc  ')).toBe(true);
      expect(isValidId('   ')).toBe(false);
      expect(isValidId('')).toBe(false);
      expect(isValidId(null)).toBe(false);
      expect(isValidId(undefined)).toBe(false);
    });
  });

  describe('security', () => {
    it('escapes regexp chars', () => {
      expect(escapeRegExp('a+b?c.d')).toBe('a\\+b\\?c\\.d');
    });

    it('normalizes safe search term', () => {
      expect(safeSearchTerm('  hello  ')).toBe('hello');
      expect(safeSearchTerm(42)).toBe('');
      expect(safeSearchTerm('abcdefgh', 4)).toBe('abcd');
    });

    it('parses integer in range with fallback', () => {
      expect(toIntInRange('10', 1, 5, 20)).toBe(10);
      expect(toIntInRange('100', 1, 5, 20)).toBe(20);
      expect(toIntInRange('-5', 1, 0, 20)).toBe(0);
      expect(toIntInRange(null, 7, 0, 20)).toBe(7);
      expect(toIntInRange('bad', 7, 0, 20)).toBe(7);
    });

    it('removes mongo operator and dotted keys recursively', () => {
      const result = sanitizeMongoObject({
        safe: 1,
        $where: 'evil',
        'a.b': 'evil',
        nested: { ok: true, $gt: 1, deep: [{ x: 1, 'y.z': 2 }] },
      });

      expect(result).toEqual({
        safe: 1,
        nested: { ok: true, deep: [{ x: 1 }] },
      });
    });
  });

  describe('cors', () => {
    it('handles preflight for allowed origin', () => {
      const request = {
        method: 'OPTIONS',
        headers: new Headers({ origin: 'https://app.example' }),
      } as any;

      const response = corsMiddleware(request, {
        allowedOrigins: ['https://app.example'],
        allowedMethods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
      });

      expect(response?.status).toBe(200);
      expect(response?.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
      expect(response?.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST');
      expect(response?.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
      expect(response?.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('returns null for non-preflight requests', () => {
      const request = { method: 'GET', headers: new Headers() } as any;
      expect(corsMiddleware(request)).toBeNull();
    });

    it('handles preflight for denied origin without credentials', () => {
      const request = {
        method: 'OPTIONS',
        headers: new Headers({ origin: 'https://denied.example' }),
      } as any;

      const response = corsMiddleware(request, {
        allowedOrigins: ['https://allowed.example'],
        credentials: false,
      });

      expect(response?.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(response?.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    });

    it('adds cors headers only for allowed origin', () => {
      const allowedRequest = {
        headers: new Headers({ origin: 'https://allowed.example' }),
      } as any;
      const deniedRequest = {
        headers: new Headers({ origin: 'https://denied.example' }),
      } as any;

      const allowed = addCorsHeaders(new NextResponse(null), allowedRequest, {
        allowedOrigins: ['https://allowed.example'],
        credentials: true,
      });
      const denied = addCorsHeaders(new NextResponse(null), deniedRequest, {
        allowedOrigins: ['https://allowed.example'],
        credentials: false,
      });

      expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
      expect(allowed.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(denied.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    });
  });

  describe('csrf-client', () => {
    beforeEach(() => {
      document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });

    it('reads csrf token from cookies', () => {
      document.cookie = 'csrf_token=abc123';
      expect(getCsrfToken()).toBe('abc123');
    });

    it('returns empty token when cookie missing', () => {
      expect(getCsrfToken()).toBe('');
    });

    it('adds csrf header for Headers init', () => {
      document.cookie = 'csrf_token=token1';
      const headers = new Headers();
      const result = withCsrfHeaders(headers) as Headers;
      expect(result.get(CSRF_HEADER_NAME)).toBe('token1');
    });

    it('adds csrf header for tuple and object init', () => {
      document.cookie = 'csrf_token=token2';
      const tupleResult = withCsrfHeaders([['x-test', '1']]) as [string, string][];
      const objectResult = withCsrfHeaders({ 'x-test': '1' }) as Record<string, string>;
      expect(tupleResult).toContainEqual([CSRF_HEADER_NAME, 'token2']);
      expect(objectResult[CSRF_HEADER_NAME]).toBe('token2');
    });

    it('does not modify headers when token missing', () => {
      const source = { 'x-test': '1' };
      expect(withCsrfHeaders(source)).toBe(source);
    });
  });

  describe('logger', () => {
    const req = {
      method: 'POST',
      url: 'https://example.com/api/orders',
      nextUrl: { pathname: '/api/orders' },
      headers: new Headers({
        'x-forwarded-for': '1.2.3.4',
        'user-agent': 'jest',
      }),
    } as any;

    const originalNodeEnv = process.env.NODE_ENV;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

    afterEach(() => {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
      jest.clearAllMocks();
    });

    afterAll(() => {
      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      debugSpy.mockRestore();
    });

    it('logs info and warn with request context', () => {
      const infoData = Logger.info('info msg', { userId: 'u1' }, req) as any;
      const warnData = Logger.warn('warn msg', { requestId: 'r1' }, req) as any;
      expect(infoData.message).toBe('info msg');
      expect(infoData.userId).toBe('u1');
      expect(infoData.ip).toBe('1.2.3.4');
      expect(warnData.level).toBe('warn');
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('logs without request context when request is missing', () => {
      const data = Logger.info('plain info') as any;
      expect(data.message).toBe('plain info');
      expect(data.method).toBeUndefined();
      expect(logSpy).toHaveBeenCalledTimes(1);
    });

    it('logs error and stack only in development', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      const err = new Error('boom');
      const data = Logger.error('failed', err, {}, req) as any;
      expect(data.level).toBe('error');
      expect(data.error).toBe('boom');
      expect(data.stack).toBeDefined();
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('falls back to x-real-ip and hides stack outside development', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      const request = {
        method: 'GET',
        url: 'https://example.com/api/ping',
        nextUrl: { pathname: '/api/ping' },
        headers: new Headers({
          'x-real-ip': '5.6.7.8',
          'user-agent': 'jest',
        }),
      } as any;

      const data = Logger.error('failed', new Error('prod-err'), {}, request) as any;
      expect(data.ip).toBe('5.6.7.8');
      expect(data.stack).toBeUndefined();
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('does not emit debug outside development', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      expect(Logger.debug('debug msg', { a: 1 }, {}, req)).toBeUndefined();
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('emits debug in development and api logger wrappers call logger', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      const debugData = Logger.debug('debug msg', { a: 1 }, { requestId: 'r2' }, req) as any;
      expect(debugData?.level).toBe('debug');
      expect(debugData?.debugData).toEqual({ a: 1 });
      expect(debugSpy).toHaveBeenCalledTimes(1);

      apiLogger.requestStarted(req);
      apiLogger.requestCompleted(req);
      apiLogger.error(new Error('oops'), req);
      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
