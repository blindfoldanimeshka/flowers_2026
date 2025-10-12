const mongoose = require('mongoose');

// Подключение к базе данных
const connect = async () => {
  try {
    // Используем localhost вместо mongodb и правильные учетные данные
    await mongoose.connect('mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin');
    console.log('Подключено к MongoDB');
  } catch (error) {
    console.error('Ошибка подключения к MongoDB:', error);
    process.exit(1);
  }
};

const fixCategories = async () => {
  try {
    const db = mongoose.connection.db;
    
    console.log('Начинаем исправление категорий...');
    
    // 1. Удаляем проблемный индекс если он существует
    try {
      await db.collection('categories').dropIndex('subcategories.slug_1');
      console.log('Удален индекс subcategories.slug_1');
    } catch (error) {
      console.log('Индекс subcategories.slug_1 не найден или уже удален');
    }
    
    // 2. Получаем все категории
    const categories = await db.collection('categories').find({}).toArray();
    console.log(`Найдено ${categories.length} категорий`);
    
    // 3. Получаем все подкатегории
    const subcategories = await db.collection('subcategories').find({}).toArray();
    console.log(`Найдено ${subcategories.length} подкатегорий`);
    
    // 4. Группируем подкатегории по categoryId
    const subcategoriesByCategory = {};
    subcategories.forEach(sub => {
      const categoryId = sub.categoryId.toString();
      if (!subcategoriesByCategory[categoryId]) {
        subcategoriesByCategory[categoryId] = [];
      }
      subcategoriesByCategory[categoryId].push(sub._id);
    });
    
    console.log('Группировка подкатегорий:', subcategoriesByCategory);
    
    // 5. Обновляем каждую категорию
    for (const category of categories) {
      const categoryId = category._id.toString();
      const subcategoryIds = subcategoriesByCategory[categoryId] || [];
      
      console.log(`Обновляем категорию "${category.name}" (${categoryId}): ${subcategoryIds.length} подкатегорий`);
      console.log('ID подкатегорий:', subcategoryIds);
      
      const result = await db.collection('categories').updateOne(
        { _id: category._id },
        { 
          $set: { 
            subcategories: subcategoryIds 
          } 
        }
      );
      
      console.log('Результат обновления:', result);
    }
    
    console.log('Исправление завершено успешно!');
    
    // 6. Проверяем результат
    const updatedCategories = await db.collection('categories').find({}).toArray();
    updatedCategories.forEach(cat => {
      console.log(`Категория "${cat.name}": ${cat.subcategories ? cat.subcategories.length : 0} подкатегорий`);
      console.log('Подкатегории:', cat.subcategories);
    });
    
  } catch (error) {
    console.error('Ошибка при исправлении категорий:', error);
  }
};

const main = async () => {
  await connect();
  await fixCategories();
  await mongoose.connection.close();
  console.log('Соединение с базой данных закрыто');
};

main().catch(console.error); 