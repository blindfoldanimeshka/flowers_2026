const encodeBase64 = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
const decodeBase64 = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

jest.mock('jose', () => {
  class SignJWT {
    private payload: Record<string, unknown>;

    constructor(payload: Record<string, unknown>) {
      this.payload = { ...payload };
    }

    setProtectedHeader() {
      return this;
    }

    setIssuedAt() {
      this.payload.iat = Math.floor(Date.now() / 1000);
      return this;
    }

    setExpirationTime(value: string) {
      if (value === '7d' && typeof this.payload.iat === 'number') {
        this.payload.exp = (this.payload.iat as number) + 7 * 24 * 60 * 60;
      }
      return this;
    }

    async sign(key: Uint8Array) {
      const secret = new TextDecoder().decode(key);
      return `mock.${encodeBase64(JSON.stringify(this.payload))}.${encodeBase64(secret)}`;
    }
  }

  const jwtVerify = async (token: string, key: Uint8Array) => {
    const [prefix, payloadB64, secretB64] = token.split('.');
    const expectedSecret = new TextDecoder().decode(key);

    if (prefix !== 'mock' || !payloadB64 || !secretB64) {
      throw new Error('invalid token');
    }

    const actualSecret = decodeBase64(secretB64);
    if (actualSecret !== expectedSecret) {
      throw new Error('invalid signature');
    }

    return { payload: JSON.parse(decodeBase64(payloadB64)) };
  };

  return { SignJWT, jwtVerify };
});

import { createToken, verifyToken, setAuthCookie, clearAuthCookie, requireAdmin, type JWTPayload } from '@/lib/auth';

const loggerErrorMock = jest.fn();

jest.mock('@/lib/productionLogger', () => ({
  productionLogger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

type CookieStore = { get: (name: string) => { value: string } | undefined };
type HeaderStore = { get: (name: string) => string | null };

function makeRequest(options: {
  cookieToken?: string;
  bearerToken?: string;
} = {}) {
  const cookies: CookieStore = {
    get: (name: string) => (name === 'auth_token' && options.cookieToken ? { value: options.cookieToken } : undefined),
  };

  const headers: HeaderStore = {
    get: (name: string) => {
      const key = name.toLowerCase();
      if (key === 'authorization' && options.bearerToken) return `Bearer ${options.bearerToken}`;
      return null;
    },
  };

  return { cookies, headers };
}

function makeResponseMock() {
  return {
    cookies: {
      set: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('lib/auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: 'test-jwt-secret', NODE_ENV: 'test' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  async function buildToken(role: string = 'admin') {
    const payload: JWTPayload = {
      userId: 'u-1',
      username: 'admin',
      role,
    };
    return createToken(payload);
  }

  it('creates and verifies JWT token', async () => {
    const token = await buildToken('admin');
    const payload = await verifyToken(token);

    expect(payload).toBeTruthy();
    expect(payload?.userId).toBe('u-1');
    expect(payload?.username).toBe('admin');
    expect(payload?.role).toBe('admin');
    expect(typeof payload?.iat).toBe('number');
    expect(typeof payload?.exp).toBe('number');
  });

  it('returns null for invalid token', async () => {
    const payload = await verifyToken('not-a-jwt');
    expect(payload).toBeNull();
  });

  it('returns null and logs if JWT secret is missing', async () => {
    delete process.env.JWT_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    const payload = await verifyToken('broken');

    expect(payload).toBeNull();
    expect(loggerErrorMock).toHaveBeenCalledWith(
      'JWT verification is unavailable because JWT secret is not configured'
    );
  });

  it('sets auth cookie with expected attributes', () => {
    const response = makeResponseMock();

    setAuthCookie(response as never, 'token-123');

    expect(response.cookies.set).toHaveBeenCalledWith(
      'auth_token',
      'token-123',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })
    );
  });

  it('clears auth cookie and csrf cookie', () => {
    const response = makeResponseMock();

    clearAuthCookie(response as never);

    expect(response.cookies.delete).toHaveBeenCalledWith('auth_token');
    expect(response.cookies.delete).toHaveBeenCalledWith('csrf_token');
  });

  it('requireAdmin succeeds with admin token from cookie', async () => {
    const token = await buildToken('admin');
    const request = makeRequest({ cookieToken: token });

    const result = await requireAdmin(request as never);

    expect(result.success).toBe(true);
    expect(result.user?.role).toBe('admin');
    expect(result.user?.userId).toBe('u-1');
  });

  it('requireAdmin uses bearer token when cookie is missing', async () => {
    const token = await buildToken('admin');
    const request = makeRequest({ bearerToken: token });

    const result = await requireAdmin(request as never);

    expect(result.success).toBe(true);
    expect(result.user?.username).toBe('admin');
  });

  it('requireAdmin fails without token', async () => {
    const request = makeRequest();

    const result = await requireAdmin(request as never);

    expect(result).toEqual({ success: false });
  });

  it('requireAdmin fails for non-admin role', async () => {
    const token = await buildToken('user');
    const request = makeRequest({ cookieToken: token });

    const result = await requireAdmin(request as never);

    expect(result).toEqual({ success: false });
  });

  it('requireAdmin fails for invalid bearer token', async () => {
    const request = makeRequest({ bearerToken: 'invalid-token' });

    const result = await requireAdmin(request as never);

    expect(result).toEqual({ success: false });
  });
});
