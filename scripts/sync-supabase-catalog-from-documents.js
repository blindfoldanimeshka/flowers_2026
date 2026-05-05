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

function parseDocRow(row) {
  if (!row) return null;
  if (row.doc && typeof row.doc === 'string') {
    try {
      return JSON.parse(row.doc);
    } catch {
      return null;
    }
  }
  if (row.doc && typeof row.doc === 'object') return row.doc;
  return null;
}

function normalizeString(value, fallback = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  return fallback;
}

function toNumber(value, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchCollection(collectionId) {
  const { data, error } = await supabase.from('documents').select('doc').eq('collection', collectionId);
  if (error) throw error;
  return (data || []).map(parseDocRow).filter(Boolean);
}

async function loadMappings() {
  const [categoriesRes, subcategoriesRes] = await Promise.all([
    supabase.from('categories').select('id,legacy_id'),
    supabase.from('subcategories').select('id,legacy_id,category_id'),
  ]);
  if (categoriesRes.error) throw categoriesRes.error;
  if (subcategoriesRes.error) throw subcategoriesRes.error;

  return {
    categoriesByLegacy: new Map((categoriesRes.data || []).map((c) => [toNumber(c.legacy_id, 0), c.id])),
    subcategoriesByLegacy: new Map((subcategoriesRes.data || []).map((s) => [toNumber(s.legacy_id, 0), s.id])),
  };
}

async function syncCategories(sourceCategories) {
  const basePayload = sourceCategories.map((c) => ({
    legacy_id: toNumber(c.id || c._id, 0),
    name: normalizeString(c.name, 'Без названия'),
    slug: normalizeString(c.slug, `category-${toNumber(c.id || c._id, Date.now())}`),
  })).filter((c) => c.legacy_id > 0);

  const { data: existing, error: existingError } = await supabase
    .from('categories')
    .select('legacy_id,slug');
  if (existingError) throw existingError;

  const takenSlugToLegacy = new Map((existing || []).map((row) => [row.slug, toNumber(row.legacy_id, 0)]));
  const usedSlugs = new Set(takenSlugToLegacy.keys());
  const payload = [];

  for (const row of basePayload) {
    let slug = row.slug;
    const ownerLegacy = takenSlugToLegacy.get(slug);
    if (ownerLegacy && ownerLegacy !== row.legacy_id) {
      slug = `${row.slug}-${row.legacy_id}`;
    }
    while (usedSlugs.has(slug) && takenSlugToLegacy.get(slug) !== row.legacy_id) {
      slug = `${slug}-x`;
    }
    usedSlugs.add(slug);
    payload.push({ ...row, slug });
  }

  const { error } = await supabase.from('categories').upsert(payload, { onConflict: 'legacy_id' });
  if (error) throw error;
}

async function syncSubcategories(sourceSubcategories, categoriesByLegacy) {
  const payload = sourceSubcategories.map((s) => {
    const categoryLegacy = toNumber(s.categoryNumId, 0);
    const categoryId = categoriesByLegacy.get(categoryLegacy);
    if (!categoryId) return null;
    return {
      legacy_id: toNumber(s._id || s.id, 0),
      category_id: categoryId,
      name: normalizeString(s.name, 'Без названия'),
      slug: normalizeString(s.slug, `subcategory-${toNumber(s._id || s.id, Date.now())}`),
      is_active: s.isActive !== false,
    };
  }).filter(Boolean);

  if (!payload.length) return;
  const { error } = await supabase.from('subcategories').upsert(payload, { onConflict: 'legacy_id' });
  if (error) throw error;
}

async function syncProducts(sourceProducts, categoriesByLegacy, subcategoriesByLegacy) {
  const payload = [];
  let sortOrder = 0;

  for (const p of sourceProducts) {
    const legacyId = toNumber(p._id || p.id, 0);
    if (!legacyId) continue;

    const categoryLegacy = toNumber(p.categoryNumId, 0);
    const subcategoryLegacy = toNumber(p.subcategoryId, 0);

    const categoryId = categoriesByLegacy.get(categoryLegacy) || null;
    const subcategoryId = subcategoriesByLegacy.get(subcategoryLegacy) || null;
    const image = normalizeString(p.image || (Array.isArray(p.images) ? p.images[0] : ''));

    if (!categoryId) continue;

    payload.push({
      legacy_id: legacyId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      name: normalizeString(p.name, `Товар #${legacyId}`),
      description: normalizeString(p.description, ''),
      price: toNumber(p.price, 0),
      old_price: p.oldPrice == null ? null : toNumber(p.oldPrice, 0),
      image_url: image,
      in_stock: p.inStock !== false,
      is_featured: false,
      sort_order: sortOrder++,
    });
  }

  if (!payload.length) return 0;

  const { error } = await supabase.from('products').upsert(payload, { onConflict: 'legacy_id' });
  if (error) throw error;
  return payload.length;
}

async function deleteStaleProducts(sourceProducts) {
  const legacyIds = new Set(sourceProducts.map((p) => toNumber(p._id || p.id, 0)).filter(Boolean));
  const { data, error } = await supabase.from('products').select('id,legacy_id');
  if (error) throw error;
  const staleIds = (data || []).filter((p) => !legacyIds.has(toNumber(p.legacy_id, 0))).map((p) => p.id);
  if (!staleIds.length) return 0;

  const { error: deleteError } = await supabase.from('products').delete().in('id', staleIds);
  if (deleteError) throw deleteError;
  return staleIds.length;
}

async function main() {
  const [categoriesDocs, subcategoriesDocs, productsDocs] = await Promise.all([
    fetchCollection(2),
    fetchCollection(3),
    fetchCollection(4),
  ]);

  await syncCategories(categoriesDocs);
  let mappings = await loadMappings();

  await syncSubcategories(subcategoriesDocs, mappings.categoriesByLegacy);
  mappings = await loadMappings();

  const syncedProducts = await syncProducts(productsDocs, mappings.categoriesByLegacy, mappings.subcategoriesByLegacy);
  const removedProducts = await deleteStaleProducts(productsDocs);

  console.log('Supabase catalog sync completed:');
  console.log(`- categories source: ${categoriesDocs.length}`);
  console.log(`- subcategories source: ${subcategoriesDocs.length}`);
  console.log(`- products upserted: ${syncedProducts}`);
  console.log(`- stale products removed: ${removedProducts}`);
}

main().catch((error) => {
  console.error('Catalog sync failed:', error.message || error);
  process.exit(1);
});


