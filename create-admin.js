const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jnbopvwnwyummzvsqjcj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
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
    const { error } = await supabase.from('admin_users').upsert(
      {
        username,
        email: 'admin@floramix.com',
        password_hash: passwordHash,
        role: 'admin',
        is_active: true,
      },
      { onConflict: 'username' }
    );

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

