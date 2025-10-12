#!/usr/bin/env node

const https = require('https');
const http = require('http');

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
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function checkHealth() {
  log('\n🏥 Проверка здоровья приложения...\n', 'cyan');
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const endpoints = [
    '/api/health',
    '/api/products',
    '/api/categories',
    '/api/stats'
  ];
  
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
  
  // Проверка MongoDB подключения
  try {
    log('\n🗄️  Проверка MongoDB...', 'blue');
    const mongoose = require('mongoose');
    
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      log('❌ MONGODB_URI не настроен', 'red');
      allHealthy = false;
    } else {
      await mongoose.connect(MONGODB_URI);
      log('✅ MongoDB подключение успешно', 'green');
      await mongoose.disconnect();
    }
  } catch (error) {
    log(`❌ MongoDB ошибка: ${error.message}`, 'red');
    allHealthy = false;
  }
  
  // Итоговый результат
  console.log('\n' + '='.repeat(50));
  
  if (allHealthy) {
    log('🎉 Все проверки пройдены успешно!', 'green');
    process.exit(0);
  } else {
    log('❌ Обнаружены проблемы', 'red');
    process.exit(1);
  }
}

// Обработка ошибок
process.on('unhandledRejection', (error) => {
  log(`❌ Необработанная ошибка: ${error.message}`, 'red');
  process.exit(1);
});

// Запуск проверки
checkHealth().catch((error) => {
  log(`❌ Критическая ошибка: ${error.message}`, 'red');
  process.exit(1);
});

