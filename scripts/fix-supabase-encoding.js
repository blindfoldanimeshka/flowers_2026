/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('SUPABASE URL/KEY is not configured');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const categoryNameBySlug = {
  rozy: 'Розы',
  tyulpany: 'Тюльпаны',
  bukety: 'Букеты',
};

const subcategoryNameBySlug = {
  'krasnye-rozy': 'Красные розы',
  'belye-rozy': 'Белые розы',
  'vesennie-tyulpany': 'Весенние тюльпаны',
  'podarochnye-bukety': 'Подарочные букеты',
};

const productByLegacyId = {
  1: {
    name: '11 красных роз',
    description: 'Классический букет из 11 красных роз.',
  },
  2: {
    name: 'Тюльпаны микс 15 шт',
    description: 'Яркий весенний букет из тюльпанов.',
  },
  3: {
    name: 'Подарочный букет',
    description: 'Подарочный букет для особенного случая.',
  },
  4: {
    name: '21 белая роза',
    description: 'Нежный букет из 21 белой розы.',
  },
};

function isCorruptedText(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const s = value.trim();
  if (/\?{2,}/.test(s)) return true;
  const bad = (s.match(/[?�]/g) || []).length;
  return bad / s.length >= 0.25;
}

async function fixCategories() {
  const { data, error } = await supabase.from('categories').select('id,name,slug');
  if (error) throw error;
  let updated = 0;

  for (const row of data || []) {
    if (!isCorruptedText(row.name)) continue;
    const repaired = categoryNameBySlug[row.slug];
    if (!repaired) continue;
    const { error: updateError } = await supabase.from('categories').update({ name: repaired }).eq('id', row.id);
    if (updateError) throw updateError;
    updated += 1;
  }
  return updated;
}

async function fixSubcategories() {
  const { data, error } = await supabase.from('subcategories').select('id,name,slug');
  if (error) throw error;
  let updated = 0;

  for (const row of data || []) {
    if (!isCorruptedText(row.name)) continue;
    const repaired = subcategoryNameBySlug[row.slug];
    if (!repaired) continue;
    const { error: updateError } = await supabase.from('subcategories').update({ name: repaired }).eq('id', row.id);
    if (updateError) throw updateError;
    updated += 1;
  }
  return updated;
}

async function fixProducts() {
  const { data, error } = await supabase.from('products').select('id,legacy_id,name,description');
  if (error) throw error;
  let updated = 0;

  for (const row of data || []) {
    const fallback = productByLegacyId[row.legacy_id];
    if (!fallback) continue;

    const next = {};
    if (isCorruptedText(row.name)) next.name = fallback.name;
    if (isCorruptedText(row.description)) next.description = fallback.description;
    if (!Object.keys(next).length) continue;

    const { error: updateError } = await supabase.from('products').update(next).eq('id', row.id);
    if (updateError) throw updateError;
    updated += 1;
  }
  return updated;
}

async function main() {
  const [categories, subcategories, products] = await Promise.all([
    fixCategories(),
    fixSubcategories(),
    fixProducts(),
  ]);

  console.log('Encoding repair completed:');
  console.log(`- categories fixed: ${categories}`);
  console.log(`- subcategories fixed: ${subcategories}`);
  console.log(`- products fixed: ${products}`);
}

main().catch((error) => {
  console.error('Encoding repair failed:', error.message || error);
  process.exit(1);
});

