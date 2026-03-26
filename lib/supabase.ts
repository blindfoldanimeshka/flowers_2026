import { createClient } from '@supabase/supabase-js';

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

export const supabaseUrl = readEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
export const supabaseKey = readEnv(
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
);

if (!supabaseUrl) {
  console.warn('SUPABASE_URL is not configured');
}

if (!supabaseKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is not configured');
}

export const SUPABASE_COLLECTION_TABLE = process.env.SUPABASE_COLLECTION_TABLE || 'documents';

const SUPABASE_FETCH_TIMEOUT_MS = 25000;
const SUPABASE_FETCH_RETRIES = 2;
const RETRY_DELAY_MS = 350;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('UND_ERR_CONNECT_TIMEOUT') ||
    message.includes('Connect Timeout Error') ||
    message.includes('fetch failed') ||
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT')
  );
}

async function supabaseFetch(input: RequestInfo | URL, init?: RequestInit) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= SUPABASE_FETCH_RETRIES; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);
      try {
        return await fetch(input, {
          ...init,
          signal: init?.signal ?? controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error;
      if (!isRetryableNetworkError(error) || attempt === SUPABASE_FETCH_RETRIES) {
        throw error;
      }
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Supabase fetch failed');
}

export const supabase = createClient(supabaseUrl || 'http://localhost', supabaseKey || 'supabase-anon-key', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: supabaseFetch,
  },
});
