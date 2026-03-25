const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jnbopvwnwyummzvsqjcj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const TABLE = process.env.SUPABASE_COLLECTION_TABLE || 'documents';

if (!SUPABASE_KEY) {
  throw new Error('Не задан SUPABASE_SERVICE_ROLE_KEY или SUPABASE_ANON_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function insertDoc(collection, doc) {
  const { error } = await supabase.from(TABLE).insert({ collection, doc });
  if (error) throw error;
}

async function cleanCollection(collection) {
  const { error } = await supabase.from(TABLE).delete().eq('collection', collection);
  if (error) throw error;
}

async function seedDatabase() {
  try {
    console.log('🔗 Подключение к Supabase установлено');

    await cleanCollection(1);
    await cleanCollection(7);
    await cleanCollection(8);

    console.log('👤 Создание пользователей...');
    const adminPassword = await bcrypt.hash('KMFlAdmin', 10);
    const userPassword = await bcrypt.hash('user12345', 10);

    await insertDoc(1, {
      username: 'AdminFlows',
      email: 'admin@flower-shop.ru',
      password: adminPassword,
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await insertDoc(1, {
      username: 'user',
      email: 'user@flower-shop.ru',
      password: userPassword,
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log('⚙️ Создание настроек...');
    await insertDoc(7, {
      _id: 'global-settings',
      siteName: 'Цветочный магазин "Роза"',
      siteDescription: 'Лучшие цветы для любого случая с доставкой по Москве',
      contactEmail: 'info@flower-shop.ru',
      contactPhone: '+7 (495) 123-45-67',
      address: 'г. Москва, ул. Цветочная, д. 1',
      workingHours: 'Пн-Вс: 9:00-21:00',
      deliveryRadius: 15,
      minOrderAmount: 500,
      freeDeliveryThreshold: 2000,
      deliveryFee: 200,
      currency: 'RUB',
      timezone: 'Europe/Moscow',
      maintenanceMode: false,
      seoTitle: 'Цветочный магазин - Доставка цветов по Москве',
      seoDescription: 'Заказать букеты и цветы с доставкой по Москве. Большой выбор, быстрая доставка.',
      seoKeywords: 'цветы, букеты, доставка цветов, цветочный магазин, розы, тюльпаны',
      socialLinks: {
        instagram: 'https://instagram.com/flower-shop',
        telegram: 'https://t.me/flower-shop',
        whatsapp: '+7 (999) 123-45-67',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log('💳 Создание настроек платежей...');
    await insertDoc(8, {
      isEnabled: true,
      currency: 'RUB',
      stripe: { enabled: false, publishableKey: '', secretKey: '', webhookSecret: '' },
      yookassa: { enabled: false, shopId: '', secretKey: '' },
      sberbank: { enabled: false, merchantId: '', apiKey: '' },
      cashOnDelivery: { enabled: true, minAmount: 0, maxAmount: 50000 },
      cardOnDelivery: { enabled: true, minAmount: 0, maxAmount: 100000 },
      taxRate: 0,
      deliveryFee: 200,
      freeDeliveryThreshold: 2000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log('✅ База данных успешно заполнена тестовыми данными');
  } catch (error) {
    console.error('❌ Ошибка при заполнении базы данных:', error.message || error);
    process.exit(1);
  }
}

seedDatabase();

