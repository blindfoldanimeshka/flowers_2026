/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');
const slugify = require('slugify');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

function parseDoc(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBoundedNumber(value, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, fallback = 0 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

async function loadDocuments(collection) {
  const { data, error } = await supabase.from('documents').select('id, created_at, updated_at, doc').eq('collection', collection);
  if (error) throw error;
  return data || [];
}

async function migrateCategories() {
  const docs = await loadDocuments(2);
  const { data: existingRows, error: existingError } = await supabase
    .from('categories')
    .select('legacy_id, slug');
  if (existingError) throw existingError;

  const takenSlugToLegacy = new Map((existingRows || []).map((r) => [r.slug, r.legacy_id]));
  const usedSlugs = new Set(takenSlugToLegacy.keys());

  for (const row of docs) {
    const doc = parseDoc(row.doc);
    if (!doc || !doc.name) continue;
    const legacyId = toNumber(doc.id || doc._id || row.id, 0) || null;
    const baseSlug = typeof doc.slug === 'string' && doc.slug.trim() ? doc.slug.trim() : slugify(String(doc.name), { lower: true, strict: true });
    let slug = baseSlug || `category-${row.id}`;
    const ownerLegacy = takenSlugToLegacy.get(slug);
    if (ownerLegacy !== undefined && ownerLegacy !== null && String(ownerLegacy) !== String(legacyId)) {
      slug = `${slug}-${legacyId || row.id}`;
    }
    while (usedSlugs.has(slug) && String(takenSlugToLegacy.get(slug)) !== String(legacyId)) {
      slug = `${slug}-x`;
    }
    usedSlugs.add(slug);

    const payload = {
      legacy_id: legacyId,
      name: String(doc.name).trim(),
      slug,
      created_at: row.created_at,
      updated_at: row.created_at,
    };
    const { error } = await supabase.from('categories').upsert(payload, { onConflict: 'legacy_id' });
    if (error) console.error('Category upsert failed:', row.id, error.message);
  }
}

async function getCategoryMap() {
  const { data, error } = await supabase.from('categories').select('id, legacy_id');
  if (error) throw error;
  const byLegacy = new Map();
  const byId = new Map();
  for (const row of data || []) {
    byId.set(String(row.id), row.id);
    if (row.legacy_id !== null) byLegacy.set(String(row.legacy_id), row.id);
  }
  return { byLegacy, byId };
}

async function migrateSubcategories(categoryMap) {
  const docs = await loadDocuments(3);
  for (const row of docs) {
    const doc = parseDoc(row.doc);
    if (!doc || !doc.name) continue;
    const categoryIdRaw = String(doc.categoryId || '').trim();
    const categoryId = categoryMap.byId.get(categoryIdRaw) || categoryMap.byLegacy.get(categoryIdRaw);
    if (!categoryId) {
      console.warn('Skip subcategory without category mapping:', row.id, categoryIdRaw);
      continue;
    }

    const legacyId = toNumber(doc.id || doc._id || row.id, 0) || null;
    const baseSlug = typeof doc.slug === 'string' && doc.slug.trim() ? doc.slug.trim() : slugify(String(doc.name), { lower: true, strict: true });
    const slug = baseSlug || `subcategory-${row.id}`;
    const payload = {
      legacy_id: legacyId,
      category_id: categoryId,
      name: String(doc.name).trim(),
      slug,
      is_active: doc.isActive !== false,
      created_at: row.created_at,
      updated_at: row.created_at,
    };
    const { error } = await supabase.from('subcategories').upsert(payload, { onConflict: 'legacy_id' });
    if (error) console.error('Subcategory upsert failed:', row.id, error.message);
  }
}

async function getSubcategoryMap() {
  const { data, error } = await supabase.from('subcategories').select('id, legacy_id');
  if (error) throw error;
  const byLegacy = new Map();
  const byId = new Map();
  for (const row of data || []) {
    byId.set(String(row.id), row.id);
    if (row.legacy_id !== null) byLegacy.set(String(row.legacy_id), row.id);
  }
  return { byLegacy, byId };
}

async function migrateProducts(categoryMap, subcategoryMap) {
  const docs = await loadDocuments(4);
  for (const row of docs) {
    const doc = parseDoc(row.doc);
    if (!doc || !doc.name) continue;

    const categoryRaw = String(doc.categoryId || '').trim();
    const categoryId = categoryMap.byId.get(categoryRaw) || categoryMap.byLegacy.get(categoryRaw);
    if (!categoryId) {
      console.warn('Skip product without category mapping:', row.id, categoryRaw);
      continue;
    }

    const subRaw = String(doc.subcategoryId || '').trim();
    const subcategoryId = subcategoryMap.byId.get(subRaw) || subcategoryMap.byLegacy.get(subRaw) || null;
    const images = Array.isArray(doc.images) ? doc.images.filter((x) => typeof x === 'string' && x.trim()) : [];
    const imageUrl = (typeof doc.image === 'string' && doc.image.trim()) || images[0] || null;

    const payload = {
      legacy_id: toNumber(doc.id || doc._id || row.id, 0) || null,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      name: String(doc.name).trim(),
      description: typeof doc.description === 'string' ? doc.description : '',
      price: toNumber(doc.price, 0),
      old_price: doc.oldPrice ?? null,
      image_url: imageUrl,
      images: images.length > 0 ? images : (imageUrl ? [imageUrl] : []),
      category_ids: Array.isArray(doc.categoryIds) && doc.categoryIds.length
        ? doc.categoryIds.map((x) => String(x)).filter(Boolean)
        : [String(categoryId)],
      category_num_id: toNumber(doc.categoryNumId, 0),
      subcategory_num_id: toNumber(doc.subcategoryNumId, 0),
      preorder_only: doc.preorderOnly === true,
      assembly_time: typeof doc.assemblyTime === 'string' ? doc.assemblyTime : '',
      stock_quantity: toNumber(doc.stockQuantity, 0),
      stock_unit: typeof doc.stockUnit === 'string' && doc.stockUnit.trim() ? doc.stockUnit : 'шт.',
      in_stock: doc.inStock !== false,
      pinned_in_category: typeof doc.pinnedInCategory === 'string' && doc.pinnedInCategory.trim() ? doc.pinnedInCategory : null,
      created_at: row.created_at,
      updated_at: row.created_at,
    };

    const { error } = await supabase.from('products').upsert(payload, { onConflict: 'legacy_id' });
    if (error) console.error('Product upsert failed:', row.id, error.message);
  }
}

async function getProductMap() {
  const { data, error } = await supabase.from('products').select('id, legacy_id');
  if (error) throw error;
  const byLegacy = new Map();
  for (const row of data || []) {
    if (row.legacy_id !== null) byLegacy.set(String(row.legacy_id), row.id);
  }
  return byLegacy;
}

async function migrateOrders(productByLegacy) {
  const docs = await loadDocuments(5);
  for (const row of docs) {
    const doc = parseDoc(row.doc);
    if (!doc || !doc.customer || !Array.isArray(doc.items)) continue;
    const customer = doc.customer || {};
    const orderNumber = String(doc.orderNumber || `MIGR-${row.id}`);
    const normalizedTotal = toBoundedNumber(doc.totalAmount, { min: 0, max: 999999999.99, fallback: 0 });
    if (Number(doc.totalAmount) !== normalizedTotal) {
      console.warn('Order total normalized:', row.id, doc.totalAmount, '->', normalizedTotal);
    }

    const orderPayload = {
      order_number: orderNumber,
      customer_name: String(customer.name || 'Клиент'),
      customer_email: customer.email ? String(customer.email) : null,
      customer_phone: String(customer.phone || ''),
      customer_address: String(customer.address || ''),
      status: String(doc.status || 'pending'),
      payment_method: String(doc.paymentMethod || 'cash'),
      fulfillment_method: String(doc.fulfillmentMethod || doc.deliveryType || 'delivery'),
      delivery_date: doc.deliveryDate || null,
      delivery_time: doc.deliveryTime || null,
      notes: doc.notes || null,
      total_amount: normalizedTotal,
      payment_status: String(doc.paymentStatus || 'pending'),
      created_at: row.created_at,
      updated_at: row.created_at,
    };

    const upsertRes = await supabase.from('orders').upsert(orderPayload, { onConflict: 'order_number' }).select('id').single();
    if (upsertRes.error || !upsertRes.data) {
      console.error('Order upsert failed:', row.id, upsertRes.error?.message);
      continue;
    }
    const orderId = upsertRes.data.id;
    await supabase.from('order_items').delete().eq('order_id', orderId);

    const itemsPayload = doc.items
      .map((item) => {
        const productLegacy = String(item.productId || '').trim();
        const productId = productByLegacy.get(productLegacy) || null;
        return {
          order_id: orderId,
          product_id: productId,
          product_name: String(item.name || 'Товар'),
          price: toNumber(item.price, 0),
          quantity: Math.max(1, toNumber(item.quantity, 1)),
          image_url: typeof item.image === 'string' ? item.image : null,
        };
      })
      .filter(Boolean);

    if (itemsPayload.length > 0) {
      const { error } = await supabase.from('order_items').insert(itemsPayload);
      if (error) console.error('Order items insert failed:', row.id, error.message);
    }
  }
}

async function migrateSettings() {
  const docs = await loadDocuments(7);
  const settingsDocRow = docs.map((row) => ({ row, doc: parseDoc(row.doc) })).find((x) => x.doc?.settingKey === 'global-settings');
  if (settingsDocRow?.doc) {
    const s = settingsDocRow.doc;
    const payload = {
      id: 'global-settings',
      site_name: s.siteName || null,
      site_description: s.siteDescription || null,
      contact_phone: s.contactPhone || null,
      contact_phone2: s.contactPhone2 || null,
      contact_phone3: s.contactPhone3 || null,
      address: s.address || null,
      working_hours: s.workingHours || null,
      pickup_hours: s.pickupHours || null,
      delivery_hours: s.deliveryHours || null,
      delivery_info: s.deliveryInfo || null,
      delivery_radius: s.deliveryRadius ?? null,
      min_order_amount: s.minOrderAmount ?? null,
      free_delivery_threshold: s.freeDeliveryThreshold ?? null,
      delivery_fee: s.deliveryFee ?? null,
      currency: s.currency || 'RUB',
      timezone: s.timezone || 'Europe/Moscow',
      maintenance_mode: Boolean(s.maintenanceMode),
      seo_title: s.seoTitle || null,
      seo_description: s.seoDescription || null,
      seo_keywords: s.seoKeywords || null,
      social_links: s.socialLinks || {},
      home_category_card_backgrounds: s.homeCategoryCardBackgrounds || {},
      home_banner_background: s.homeBannerBackground || null,
      home_banner_slides: Array.isArray(s.homeBannerSlides) ? s.homeBannerSlides : [],
      media_library: Array.isArray(s.mediaLibrary) ? s.mediaLibrary : [],
    };
    const { error } = await supabase.from('settings').upsert(payload, { onConflict: 'id' });
    if (error) console.error('Settings upsert failed:', error.message);
  }

  const paymentDocRow = docs.map((row) => ({ row, doc: parseDoc(row.doc) })).find((x) => x.doc?.settingKey === 'payment-settings');
  if (paymentDocRow?.doc) {
    const p = paymentDocRow.doc;
    const payload = {
      id: 'default',
      is_enabled: p.isEnabled !== false,
      currency: p.currency || 'RUB',
      stripe: p.stripe || {},
      yookassa: p.yookassa || {},
      sberbank: p.sberbank || {},
      cash_on_delivery: p.cashOnDelivery || {},
      card_on_delivery: p.cardOnDelivery || {},
      tax_rate: toNumber(p.taxRate, 0),
      delivery_fee: toNumber(p.deliveryFee, 0),
      free_delivery_threshold: toNumber(p.freeDeliveryThreshold, 0),
    };
    const { error } = await supabase.from('payment_settings').upsert(payload, { onConflict: 'id' });
    if (error) console.error('Payment settings upsert failed:', error.message);
  }
}

async function migrateAdminUsers() {
  const docs = await loadDocuments(1);
  for (const row of docs) {
    const doc = parseDoc(row.doc);
    if (!doc?.username || !doc?.password) continue;
    const payload = {
      username: String(doc.username),
      email: typeof doc.email === 'string' ? doc.email : null,
      password_hash: String(doc.password),
      role: String(doc.role || 'admin'),
      is_active: true,
      created_at: row.created_at,
      updated_at: row.created_at,
    };
    const { error } = await supabase.from('admin_users').upsert(payload, { onConflict: 'username' });
    if (error) console.error('Admin user upsert failed:', row.id, error.message);
  }
}

async function main() {
  console.log('Starting migration from documents to relational tables...');
  await migrateCategories();
  const categoryMap = await getCategoryMap();
  await migrateSubcategories(categoryMap);
  const subcategoryMap = await getSubcategoryMap();
  await migrateProducts(categoryMap, subcategoryMap);
  const productByLegacy = await getProductMap();
  await migrateOrders(productByLegacy);
  await migrateSettings();
  await migrateAdminUsers();
  console.log('Migration completed.');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
