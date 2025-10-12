const { MongoClient } = require('mongodb');

async function cleanNullSlugs() {
  const client = new MongoClient('mongodb://floweradmin:flowerpassword@mongodb:27017/flowerdb?authSource=admin');
  
  try {
    await client.connect();
    const db = client.db('flowerdb');
    
    console.log('Ищем записи с null slug в подкатегориях...');
    
    const collection = db.collection('subcategories');
    
    // Находим все записи с null slug
    const nullSlugDocs = await collection.find({ slug: null }).toArray();
    console.log(`Найдено ${nullSlugDocs.length} записей с null slug`);
    
    if (nullSlugDocs.length > 0) {
      // Удаляем записи с null slug
      const result = await collection.deleteMany({ slug: null });
      console.log(`Удалено ${result.deletedCount} записей с null slug`);
    }
    
    // Также очищаем пустые значения slug
    const emptySlugDocs = await collection.find({ slug: "" }).toArray();
    console.log(`Найдено ${emptySlugDocs.length} записей с пустым slug`);
    
    if (emptySlugDocs.length > 0) {
      const result = await collection.deleteMany({ slug: "" });
      console.log(`Удалено ${result.deletedCount} записей с пустым slug`);
    }
    
    console.log('Очистка завершена!');
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await client.close();
  }
}

cleanNullSlugs();
