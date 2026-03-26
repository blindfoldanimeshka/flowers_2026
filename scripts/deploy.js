#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function runCommand(command, description) {
  try {
    log(`\n🔧 ${description}...`, 'blue');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} завершено`, 'green');
  } catch (error) {
    log(`❌ Ошибка в ${description}: ${error.message}`, 'red');
    process.exit(1);
  }
}

function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log('⚠️  Есть незакоммиченные изменения:', 'yellow');
      console.log(status);
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        rl.question('Продолжить деплой? (y/N): ', (answer) => {
          rl.close();
          if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            resolve(true);
          } else {
            log('❌ Деплой отменен', 'red');
            process.exit(0);
          }
        });
      });
    }
    return true;
  } catch (error) {
    log(`❌ Ошибка проверки Git: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function deploy() {
  log('🚀 Начало процесса деплоя...\n', 'cyan');
  
  // Проверка Git статуса
  await checkGitStatus();
  
  // Проверка TypeScript
  runCommand('npm run type-check', 'Проверка TypeScript');
  
  // Проверка ESLint
  runCommand('npm run lint', 'Проверка ESLint');
  
  // Сборка проекта
  runCommand('npm run build', 'Сборка проекта');
  
  // Проверка тестов
  runCommand('npm run test', 'Запуск тестов');
  
  // Коммит изменений
  const commitMessage = process.argv[2] || 'Deploy to production';
  runCommand(`git add .`, 'Добавление файлов в Git');
  runCommand(`git commit -m "${commitMessage}"`, 'Коммит изменений');
  
  // Пуш в репозиторий
  runCommand('git push origin main', 'Отправка в репозиторий');
  
  log('\n🎉 Деплой завершен успешно!', 'green');
  log('📋 Следующие шаги:', 'blue');
  log('1. Проверьте статус деплоя в Vercel Dashboard', 'yellow');
  log('2. Убедитесь, что все переменные окружения настроены', 'yellow');
  log('3. Проверьте работу приложения в продакшене', 'yellow');
}

// Обработка ошибок
process.on('unhandledRejection', (error) => {
  log(`❌ Необработанная ошибка: ${error.message}`, 'red');
  process.exit(1);
});

// Запуск деплоя
deploy().catch((error) => {
  log(`❌ Критическая ошибка: ${error.message}`, 'red');
  process.exit(1);
});

