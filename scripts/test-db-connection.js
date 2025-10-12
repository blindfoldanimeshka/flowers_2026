/**
 * Скрипт для проверки подключения к MongoDB
 * 
 * Запуск: node scripts/test-db-connection.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Попытка подключения к MongoDB...');
    
    // Используем localhost вместо mongodb
    const mongoUrl = process.env.MONGODB_URI.replace('mongodb://floweradmin:flowerpassword@mongodb:', 'mongodb://floweradmin:flowerpassword@localhost:');
    console.log('URL подключения:', mongoUrl);
    
    await mongoose.connect(mongoUrl);
    console.log('MongoDB успешно подключена!');
    
    // Проверяем доступные коллекции
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Доступные коллекции:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Отключаемся
    await mongoose.disconnect();
    console.log('Отключено от MongoDB');
  } catch (err) {
    console.error('Ошибка подключения к MongoDB:', err);
    process.exit(1);
  }
}

testConnection(); 