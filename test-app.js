const mongoose = require('mongoose');

// Конфигурация
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/flowers_production?retryWrites=true&w=majority';

console.log('🧪 Тестирование приложения...');
console.log('URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));

async function testApp() {
  try {
    console.log('\n1️⃣ Тестирование подключения к MongoDB Atlas...');
    
    await mongoose.connect(MONGODB_URI, {
      authSource: 'admin'
    });
    
    console.log('✅ Подключение к MongoDB Atlas успешно!');
    
    // Тест создания коллекции
    console.log('\n2️⃣ Тестирование записи в базу данных...');
    const testCollection = mongoose.connection.db.collection('test_connection');
    await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'Test connection successful'
    });
    
    console.log('✅ Запись в базу данных успешна!');
    
    // Тест чтения
    console.log('\n3️⃣ Тестирование чтения из базы данных...');
    const result = await testCollection.findOne({ test: true });
    console.log('✅ Чтение из базы данных успешно!');
    console.log('📄 Результат:', result.message);
    
    // Очистка тестовых данных
    console.log('\n4️⃣ Очистка тестовых данных...');
    await testCollection.deleteMany({ test: true });
    console.log('✅ Тестовые данные очищены');
    
    await mongoose.disconnect();
    console.log('\n🎉 Все тесты прошли успешно!');
    console.log('✅ Приложение готово к деплою на Vercel!');
    
  } catch (error) {
    console.error('\n❌ Ошибка тестирования:');
    console.error(error.message);
    
    console.log('\n🔧 Возможные решения:');
    console.log('1. Проверьте MONGODB_URI в переменных окружения');
    console.log('2. Убедитесь, что IP 0.0.0.0/0 добавлен в Network Access');
    console.log('3. Проверьте username и password');
    console.log('4. Убедитесь, что кластер запущен');
    
    process.exit(1);
  }
}

// Запуск тестов
testApp();

