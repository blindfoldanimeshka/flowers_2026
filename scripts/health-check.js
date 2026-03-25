#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('error', (error) => reject(error));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function checkHealth() {
  log('\n🏥 Проверка здоровья приложения...\n', 'cyan');

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const endpoints = ['/api/health', '/api/products', '/api/categories', '/api/stats'];

  let allHealthy = true;

  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    try {
      log(`🔍 Проверка: ${endpoint}`, 'blue');
      const response = await makeRequest(url);
      if (response.statusCode === 200) {
        log(`✅ ${endpoint} - OK (${response.statusCode})`, 'green');
      } else {
        log(`⚠️  ${endpoint} - ${response.statusCode}`, 'yellow');
        allHealthy = false;
      }
    } catch (error) {
      log(`❌ ${endpoint} - ${error.message}`, 'red');
      allHealthy = false;
    }
  }

  try {
    log('\n🗄️  Проверка Supabase...', 'blue');

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    const TABLE = process.env.SUPABASE_COLLECTION_TABLE || 'documents';

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      log('❌ SUPABASE_URL или ключ не настроены', 'red');
      allHealthy = false;
    } else {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error } = await supabase.from(TABLE).select('id').limit(1);
      if (error) throw error;
      log('✅ Supabase подключение успешно', 'green');
    }
  } catch (error) {
    log(`❌ Supabase ошибка: ${error.message}`, 'red');
    allHealthy = false;
  }

  console.log('\n' + '='.repeat(50));

  if (allHealthy) {
    log('🎉 Все проверки пройдены успешно!', 'green');
    process.exit(0);
  } else {
    log('❌ Обнаружены проблемы', 'red');
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => {
  log(`❌ Необработанная ошибка: ${error.message}`, 'red');
  process.exit(1);
});

checkHealth().catch((error) => {
  log(`❌ Критическая ошибка: ${error.message}`, 'red');
  process.exit(1);
});
