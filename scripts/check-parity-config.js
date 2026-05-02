/* eslint-disable no-console */
require('dotenv').config();

function asBool(value, fallback = false) {
  if (typeof value !== 'string') return fallback;
  return value.trim().toLowerCase() === 'true';
}

const flags = {
  USE_SUPABASE_CATALOG: asBool(process.env.USE_SUPABASE_CATALOG),
  USE_SUPABASE_SETTINGS: asBool(process.env.USE_SUPABASE_SETTINGS),
  USE_SUPABASE_ORDERS: asBool(process.env.USE_SUPABASE_ORDERS),
  USE_SUPABASE_ADMIN: asBool(process.env.USE_SUPABASE_ADMIN),
};

const values = Object.values(flags);
const hasTrue = values.some(Boolean);
const hasFalse = values.some((v) => !v);
const mixed = hasTrue && hasFalse;
const bypass = asBool(process.env.ALLOW_MIXED_SOURCES);

console.log('[Parity Check] Data source flags:', flags);

if (!mixed) {
  console.log('[Parity Check] OK: источники данных согласованы.');
  process.exit(0);
}

if (bypass) {
  console.warn('[Parity Check] WARNING: смешанный режим разрешен через ALLOW_MIXED_SOURCES=true');
  process.exit(0);
}

console.error('');
console.error('[Parity Check] ERROR: обнаружен смешанный режим источников данных.');
console.error('Это главная причина расхождения dev и production.');
console.error('');
console.error('Как исправить:');
console.error('1) Выставьте все USE_SUPABASE_* либо в true, либо в false.');
console.error('2) Перезапустите сервер.');
console.error('');
console.error('Временный обход (не рекомендуется):');
console.error('ALLOW_MIXED_SOURCES=true npm run dev');
process.exit(1);

