#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Настройка проекта Flower Production...\n');

// Проверка Node.js версии
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    console.error('❌ Требуется Node.js версии 18 или выше');
    console.error(`Текущая версия: ${nodeVersion}`);
    process.exit(1);
  }
  
  console.log(`✅ Node.js версия: ${nodeVersion}`);
}

// Создание .env файла
function createEnvFile() {
  const envExamplePath = path.join(process.cwd(), 'env.example');
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ Создан файл .env.local на основе env.example');
    } else {
      console.log('⚠️  Файл env.example не найден');
    }
  } else {
    console.log('✅ Файл .env.local уже существует');
  }
}

// Установка зависимостей
function installDependencies() {
  console.log('\n📦 Установка зависимостей...');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Зависимости установлены');
  } catch (error) {
    console.error('❌ Ошибка установки зависимостей:', error.message);
    process.exit(1);
  }
}

// Проверка TypeScript
function checkTypeScript() {
  console.log('\n🔍 Проверка TypeScript...');
  
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('✅ TypeScript проверка пройдена');
  } catch (error) {
    console.log('⚠️  Найдены ошибки TypeScript');
  }
}

// Проверка ESLint
function checkESLint() {
  console.log('\n🔍 Проверка ESLint...');
  
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    console.log('✅ ESLint проверка пройдена');
  } catch (error) {
    console.log('⚠️  Найдены ошибки ESLint');
  }
}

// Создание директорий
function createDirectories() {
  const dirs = [
    'public/uploads',
    'backups',
    'logs'
  ];
  
  dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Создана директория: ${dir}`);
    }
  });
}

// Генерация секретов
function generateSecrets() {
  console.log('\n🔐 Генерация секретов...');
  
  try {
    execSync('node generate-secrets.js', { stdio: 'inherit' });
    console.log('✅ Секреты сгенерированы');
  } catch (error) {
    console.log('⚠️  Ошибка генерации секретов');
  }
}

// Основная функция
function main() {
  try {
    checkNodeVersion();
    createEnvFile();
    installDependencies();
    createDirectories();
    generateSecrets();
    checkTypeScript();
    checkESLint();
    
    console.log('\n🎉 Настройка завершена!');
    console.log('\n📋 Следующие шаги:');
    console.log('1. Настройте переменные в .env.local');
    console.log('2. Настройте MongoDB Atlas');
    console.log('3. Запустите: npm run dev');
    console.log('4. Проверьте: npm run test');
    
  } catch (error) {
    console.error('❌ Ошибка настройки:', error.message);
    process.exit(1);
  }
}

main();

