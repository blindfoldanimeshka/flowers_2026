const mongoose = require('mongoose');

// Замени на свою строку подключения
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority';

console.log('🔗 Тестирование подключения к MongoDB Atlas...');
console.log('URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Скрываем пароль в логах

async function testConnection() {
  try {
    console.log('⏳ Подключение к MongoDB Atlas...');
    
    await mongoose.connect(MONGODB_URI, {
      authSource: 'admin'
    });
    
    console.log('✅ Успешно подключен к MongoDB Atlas!');
    
    // Тестируем создание коллекции
    const testCollection = mongoose.connection.db.collection('test_connection');
    await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date() 
    });
    
    console.log('✅ Тест записи прошел успешно!');
    
    // Очищаем тестовые данные
    await testCollection.deleteMany({ test: true });
    console.log('✅ Тестовые данные очищены');
    
    await mongoose.disconnect();
    console.log('✅ Отключение прошло успешно!');
    
    console.log('\n🎉 MongoDB Atlas настроен правильно!');
    console.log('Теперь можно деплоить на Vercel!');
    
  } catch (error) {
    console.error('❌ Ошибка подключения к MongoDB Atlas:');
    console.error(error.message);
    
    console.log('\n🔧 Возможные решения:');
    console.log('1. Проверь строку подключения MONGODB_URI');
    console.log('2. Убедись, что IP 0.0.0.0/0 добавлен в Network Access');
    console.log('3. Проверь username и password');
    console.log('4. Убедись, что кластер запущен (может занять несколько минут)');
    
    process.exit(1);
  }
}

testConnection();

