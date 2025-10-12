const { MongoClient } = require('mongodb');

async function removeSlugIndex() {
  const client = new MongoClient('mongodb://floweradmin:flowerpassword@mongodb:27017/flowerdb?authSource=admin');
  
  try {
    await client.connect();
    const db = client.db('flowerdb');
    
    console.log('Проверяем индексы коллекции subcategories...');
    
    const collection = db.collection('subcategories');
    const indexes = await collection.indexes();
    
    console.log('Существующие индексы:', indexes.map(idx => idx.name));
    
    // Ищем индекс по slug
    const slugIndex = indexes.find(idx => idx.key && idx.key.slug);
    
    if (slugIndex) {
      console.log(`Найден индекс на slug: ${slugIndex.name}`);
      console.log('Удаляем индекс...');
      
      await collection.dropIndex(slugIndex.name);
      console.log('Индекс успешно удален!');
    } else {
      console.log('Индекс на slug не найден');
    }
    
    console.log('Готово!');
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await client.close();
  }
}

removeSlugIndex();
