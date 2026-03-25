const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jnbopvwnwyummzvsqjcj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const TABLE = process.env.SUPABASE_COLLECTION_TABLE || 'documents';

console.log('🧪 Тестирование подключения к Supabase...');
console.log('URL:', SUPABASE_URL);

async function testApp() {
  try {
    if (!SUPABASE_KEY) {
      throw new Error('Не задан SUPABASE_SERVICE_ROLE_KEY или SUPABASE_ANON_KEY');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    console.log('\n1️⃣ Проверка чтения из таблицы документов...');
    const { error: readError } = await supabase.from(TABLE).select('id').limit(1);
    if (readError) throw readError;
    console.log('✅ Чтение успешно');

    console.log('\n2️⃣ Тест записи в таблицу...');
    const payload = {
      collection: 'healthcheck',
      doc: { message: 'Test connection successful', createdAt: new Date().toISOString() },
    };

    const { data: inserted, error: insertError } = await supabase
      .from(TABLE)
      .insert(payload)
      .select('id')
      .single();

    if (insertError) throw insertError;
    console.log('✅ Запись успешна');

    console.log('\n3️⃣ Очистка тестовой записи...');
    const { error: deleteError } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', inserted.id);

    if (deleteError) throw deleteError;
    console.log('✅ Очистка успешна');

    console.log('\n🎉 Все тесты Supabase пройдены успешно!');
  } catch (error) {
    console.error('\n❌ Ошибка тестирования:');
    console.error(error.message);

    console.log('\n🔧 Возможные решения:');
    console.log('1. Проверьте SUPABASE_URL и ключи в .env');
    console.log('2. Создайте таблицу documents (SQL в scripts/supabase-init.sql)');
    console.log('3. Проверьте RLS/права на таблицу documents');

    process.exit(1);
  }
}

testApp();
