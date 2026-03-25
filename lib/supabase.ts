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

export const supabase = createClient(supabaseUrl || 'http://localhost', supabaseKey || 'supabase-anon-key', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
