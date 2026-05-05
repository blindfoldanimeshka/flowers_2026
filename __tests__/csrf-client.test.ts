import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';
import { getCsrfToken, withCsrfHeaders } from '@/lib/csrf-client';

describe('lib/csrf-client', () => {
  afterEach(() => {
    document.cookie = `${CSRF_COOKIE_NAME}=; Max-Age=0; path=/`;
  });

  it('reads csrf token from cookie', () => {
    document.cookie = `${CSRF_COOKIE_NAME}=token%20value; path=/`;

    expect(getCsrfToken()).toBe('token value');
  });

  it('returns empty string when token is absent', () => {
    expect(getCsrfToken()).toBe('');
  });

  it('adds csrf header to plain object headers', () => {
    document.cookie = `${CSRF_COOKIE_NAME}=obj-token; path=/`;

    const result = withCsrfHeaders({ 'content-type': 'application/json' }) as Record<string, string>;

    expect(result['content-type']).toBe('application/json');
    expect(result[CSRF_HEADER_NAME]).toBe('obj-token');
  });

  it('adds csrf header to Headers instance', () => {
    document.cookie = `${CSRF_COOKIE_NAME}=headers-token; path=/`;

    const headers = new Headers({ accept: 'application/json' });
    const result = withCsrfHeaders(headers) as Headers;

    expect(result).toBe(headers);
    expect(result.get(CSRF_HEADER_NAME)).toBe('headers-token');
  });

  it('adds csrf header to tuple array headers', () => {
    document.cookie = `${CSRF_COOKIE_NAME}=array-token; path=/`;

    const result = withCsrfHeaders([['accept', 'application/json']]) as [string, string][];

    expect(result).toContainEqual(['accept', 'application/json']);
    expect(result).toContainEqual([CSRF_HEADER_NAME, 'array-token']);
  });

  it('leaves headers unchanged when csrf token is missing', () => {
    const source = { accept: 'application/json' };
    const result = withCsrfHeaders(source);

    expect(result).toBe(source);
  });
});
