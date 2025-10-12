const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin';

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔗 Подключение к MongoDB установлено');
    
    const db = client.db();
    
    // Создаем администратора
    console.log('👤 Создание администратора...');
    const adminPassword = await bcrypt.hash('KMFlAdmin', 10);
    const userPassword = await bcrypt.hash('user12345', 10);
    
    const adminUser = {
      _id: new ObjectId(),
      username: 'AdminFlows',
      email: 'admin@flower-shop.ru',
      password: adminPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const regularUser = {
      _id: new ObjectId(),
      username: 'user',
      email: 'user@flower-shop.ru',
      password: userPassword,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('users').insertMany([adminUser, regularUser]);
  
    // Создаем настройки
    console.log('⚙️ Создание настроек...');
    await db.collection('settings').insertOne({
      siteName: 'Цветочный магазин "Роза"',
      siteDescription: 'Лучшие цветы для любого случая с доставкой по Москве',
      contactEmail: 'info@flower-shop.ru',
      contactPhone: '+7 (495) 123-45-67',
      address: 'г. Москва, ул. Цветочная, д. 1',
      workingHours: 'Пн-Вс: 9:00-21:00',
      deliveryRadius: 15,
      minOrderAmount: 500,
      freeDeliveryThreshold: 2000,
      deliveryFee: 200,
      currency: 'RUB',
      timezone: 'Europe/Moscow',
      maintenanceMode: false,
      seoTitle: 'Цветочный магазин - Доставка цветов по Москве',
      seoDescription: 'Заказать букеты и цветы с доставкой по Москве. Большой выбор, быстрая доставка.',
      seoKeywords: 'цветы, букеты, доставка цветов, цветочный магазин, розы, тюльпаны',
      socialLinks: {
        instagram: 'https://instagram.com/flower-shop',
        telegram: 'https://t.me/flower-shop',
        whatsapp: '+7 (999) 123-45-67'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Создаем настройки платежей
    console.log('💳 Создание настроек платежей...');
    await db.collection('paymentsettings').insertOne({
      isEnabled: true,
      currency: 'RUB',
      stripe: {
        enabled: false,
        publishableKey: '',
        secretKey: '',
        webhookSecret: ''
      },
      yookassa: {
        enabled: false,
        shopId: '',
        secretKey: ''
      },
      sberbank: {
        enabled: false,
        merchantId: '',
        apiKey: ''
      },
      cashOnDelivery: {
        enabled: true,
        minAmount: 0,
        maxAmount: 50000
      },
      cardOnDelivery: {
        enabled: true,
        minAmount: 0,
        maxAmount: 100000
      },
      taxRate: 0,
      deliveryFee: 200,
      freeDeliveryThreshold: 2000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ База данных успешно заполнена валидными тестовыми данными!');
    console.log('\n📊 Статистика:');
    console.log(`   - Администраторов: 1`);
    console.log('\n🔑 Данные для входа:');
    console.log(`   - Логин: AdminFlows`);
    console.log(`   - Пароль: KMFlAdmin`);
    console.log(`   - Логин пользователя: user`);
    console.log(`   - Пароль: user12345`);
    
  } catch (error) {
    console.error('❌ Ошибка при заполнении базы данных:', error);
  } finally {
    await client.close();
  }
}

// Запуск заполнения базы данных
seedDatabase(); 