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

async function createAdmin() {
  try {
    const username = 'AdminFlows';
    const passwordHash = await bcrypt.hash('KMFlAdmin', 10);

    await supabase.from(TABLE).delete().eq('collection', 1);

    const { error } = await supabase.from(TABLE).insert({
      collection: 1,
      doc: {
        username,
        email: 'admin@floramix.com',
        password: passwordHash,
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    if (error) throw error;

    console.log('Администратор создан успешно');
    console.log('Логин: AdminFlows');
    console.log('Пароль: KMFlAdmin');
  } catch (error) {
    console.error('Ошибка:', error.message || error);
    process.exit(1);
  }
}

createAdmin();

