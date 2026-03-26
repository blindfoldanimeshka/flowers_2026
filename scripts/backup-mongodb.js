const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Конфигурация
const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/flowerdb',
  backupDir: process.env.BACKUP_DIR || './backups',
  maxBackups: parseInt(process.env.MAX_BACKUPS || '7'), // Хранить 7 последних бэкапов
};

// Создаем директорию для бэкапов если её нет
if (!fs.existsSync(config.backupDir)) {
  fs.mkdirSync(config.backupDir, { recursive: true });
}

// Функция для создания бэкапа
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(config.backupDir, `backup-${timestamp}.gz`);
  
  console.log(`🔄 Создание бэкапа: ${backupFile}`);
  
  // Команда для создания бэкапа
  const command = `mongodump --uri="${config.mongoUri}" --archive="${backupFile}" --gzip`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Ошибка при создании бэкапа:', error);
      return;
    }
    
    console.log('✅ Бэкап успешно создан:', backupFile);
    
    // Очищаем старые бэкапы
    cleanupOldBackups();
  });
}

// Функция для очистки старых бэкапов
function cleanupOldBackups() {
  fs.readdir(config.backupDir, (err, files) => {
    if (err) {
      console.error('❌ Ошибка при чтении директории бэкапов:', err);
      return;
    }
    
    // Фильтруем только файлы бэкапов
    const backupFiles = files
      .filter(file => file.startsWith('backup-') && file.endsWith('.gz'))
      .map(file => ({
        name: file,
        path: path.join(config.backupDir, file),
        mtime: fs.statSync(path.join(config.backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime); // Сортируем по дате создания (новые первыми)
    
    // Удаляем старые бэкапы
    if (backupFiles.length > config.maxBackups) {
      const filesToDelete = backupFiles.slice(config.maxBackups);
      
      filesToDelete.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) {
            console.error(`❌ Ошибка при удалении старого бэкапа ${file.name}:`, err);
          } else {
            console.log(`🗑️  Удален старый бэкап: ${file.name}`);
          }
        });
      });
    }
  });
}

// Функция для восстановления бэкапа
function restoreBackup(backupFile) {
  if (!fs.existsSync(backupFile)) {
    console.error('❌ Файл бэкапа не найден:', backupFile);
    return;
  }
  
  console.log(`🔄 Восстановление из бэкапа: ${backupFile}`);
  
  const command = `mongorestore --uri="${config.mongoUri}" --archive="${backupFile}" --gzip`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Ошибка при восстановлении бэкапа:', error);
      return;
    }
    
    console.log('✅ Бэкап успешно восстановлен');
  });
}

// Основная логика
const action = process.argv[2];

switch (action) {
  case 'backup':
    createBackup();
    break;
    
  case 'restore':
    const backupFile = process.argv[3];
    if (!backupFile) {
      console.error('❌ Укажите файл бэкапа для восстановления');
      console.log('Пример: node scripts/backup-mongodb.js restore ./backups/backup-2024-01-01.gz');
      process.exit(1);
    }
    restoreBackup(backupFile);
    break;
    
  case 'list':
    fs.readdir(config.backupDir, (err, files) => {
      if (err) {
        console.error('❌ Ошибка при чтении директории бэкапов:', err);
        return;
      }
      
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.gz'))
        .map(file => {
          const stats = fs.statSync(path.join(config.backupDir, file));
          return {
            name: file,
            size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
            date: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log('📋 Доступные бэкапы:');
      backupFiles.forEach(file => {
        console.log(`  ${file.name} (${file.size}) - ${file.date}`);
      });
    });
    break;
    
  default:
    console.log('🔧 Скрипт для управления бэкапами MongoDB');
    console.log('');
    console.log('Использование:');
    console.log('  node scripts/backup-mongodb.js backup     - Создать бэкап');
    console.log('  node scripts/backup-mongodb.js restore <file> - Восстановить из бэкапа');
    console.log('  node scripts/backup-mongodb.js list       - Показать список бэкапов');
    console.log('');
    console.log('Переменные окружения:');
    console.log('  MONGODB_URI - URI подключения к MongoDB');
    console.log('  BACKUP_DIR - Директория для бэкапов (по умолчанию: ./backups)');
    console.log('  MAX_BACKUPS - Максимальное количество бэкапов (по умолчанию: 7)');
}
