import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  clearCsrfCookie,
  generateCsrfToken,
  isTrustedOriginRequest,
  isValidCsrfRequest,
  setCsrfCookie,
} from '@/lib/csrf';

function makeResponseMock() {
  return {
    cookies: {
      set: jest.fn(),
      delete: jest.fn(),
    },
  };
}

function makeHeaderBag(input: Record<string, string | undefined>) {
  return {
    get: (name: string) => input[name.toLowerCase()] ?? null,
  };
}

describe('lib/csrf', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'test' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('generates 32-byte hex csrf token', () => {
    const token = generateCsrfToken();

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(generateCsrfToken()).not.toBe(token);
  });

  it('sets csrf cookie with expected attributes', () => {
    const response = makeResponseMock();

    setCsrfCookie(response as never, 'csrf-123');

    expect(response.cookies.set).toHaveBeenCalledWith(
      CSRF_COOKIE_NAME,
      'csrf-123',
      expect.objectContaining({
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })
    );
  });

  it('clears csrf cookie', () => {
    const response = makeResponseMock();

    clearCsrfCookie(response as never);

    expect(response.cookies.delete).toHaveBeenCalledWith(CSRF_COOKIE_NAME);
  });

  it('validates csrf by matching cookie and header', () => {
    const request = {
      cookies: { get: () => ({ value: 'same-token' }) },
      headers: makeHeaderBag({ [CSRF_HEADER_NAME]: 'same-token' }),
    };

    expect(isValidCsrfRequest(request as never)).toBe(true);
  });

  it('rejects csrf when cookie/header missing or mismatched', () => {
    const missingHeader = {
      cookies: { get: () => ({ value: 'same-token' }) },
      headers: makeHeaderBag({}),
    };
    const mismatch = {
      cookies: { get: () => ({ value: 'one-token' }) },
      headers: makeHeaderBag({ [CSRF_HEADER_NAME]: 'other-token' }),
    };

    expect(isValidCsrfRequest(missingHeader as never)).toBe(false);
    expect(isValidCsrfRequest(mismatch as never)).toBe(false);
  });

  it('trusts request origin when it matches app origin', () => {
    const request = {
      nextUrl: { origin: 'https://flowers.test', protocol: 'https:' },
      headers: makeHeaderBag({ origin: 'https://flowers.test' }),
    };

    expect(isTrustedOriginRequest(request as never)).toBe(true);
  });

  it('trusts referer when origin header is absent', () => {
    const request = {
      nextUrl: { origin: 'https://flowers.test', protocol: 'https:' },
      headers: makeHeaderBag({ referer: 'https://flowers.test/admin?page=1' }),
    };

    expect(isTrustedOriginRequest(request as never)).toBe(true);
  });

  it('trusts forwarded host/proto origin', () => {
    const request = {
      nextUrl: { origin: 'http://internal.local', protocol: 'http:' },
      headers: makeHeaderBag({
        origin: 'https://shop.example.com',
        'x-forwarded-host': 'shop.example.com',
        'x-forwarded-proto': 'https',
      }),
    };

    expect(isTrustedOriginRequest(request as never)).toBe(true);
  });

  it('trusts configured allowed origins', () => {
    process.env.ALLOWED_ORIGINS = 'https://a.example.com, https://b.example.com';

    const request = {
      nextUrl: { origin: 'https://flowers.test', protocol: 'https:' },
      headers: makeHeaderBag({ origin: 'https://b.example.com' }),
    };

    expect(isTrustedOriginRequest(request as never)).toBe(true);
  });

  it('rejects missing origin and referer', () => {
    const request = {
      nextUrl: { origin: 'https://flowers.test', protocol: 'https:' },
      headers: makeHeaderBag({}),
    };

    expect(isTrustedOriginRequest(request as never)).toBe(false);
  });

  it('rejects untrusted or invalid origins', () => {
    const untrusted = {
      nextUrl: { origin: 'https://flowers.test', protocol: 'https:' },
      headers: makeHeaderBag({ origin: 'https://evil.example' }),
    };
    const invalid = {
      nextUrl: { origin: 'https://flowers.test', protocol: 'https:' },
      headers: makeHeaderBag({ origin: 'not-a-url' }),
    };

    expect(isTrustedOriginRequest(untrusted as never)).toBe(false);
    expect(isTrustedOriginRequest(invalid as never)).toBe(false);
  });
});
