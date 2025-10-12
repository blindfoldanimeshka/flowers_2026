const { MongoClient } = require('mongodb');

async function fixDatabase() {
  const client = new MongoClient('mongodb://floweradmin:flowerpassword@mongodb:27017/flowerdb?authSource=admin');
  
  try {
    await client.connect();
    const db = client.db('flowerdb');
    
    const categories = await db.collection('categories').find({}).toArray();
    const subcategories = await db.collection('subcategories').find({}).toArray();
    
    console.log(`Найдено ${categories.length} категорий и ${subcategories.length} подкатегорий`);
    
    // Создаем карту существующих подкатегорий
    const subcategoryIds = new Set(subcategories.map(sub => sub._id.toString()));
    
    // Исправляем каждую категорию
    for (const category of categories) {
      const validSubcategoryIds = category.subcategories.filter(subId => 
        subcategoryIds.has(subId.toString())
      );
      
      // Добавляем недостающие подкатегории
      for (const subcategory of subcategories) {
        if (subcategory.categoryId.toString() === category._id.toString()) {
          const subIdStr = subcategory._id.toString();
          if (!validSubcategoryIds.some(id => id.toString() === subIdStr)) {
            validSubcategoryIds.push(subcategory._id);
          }
        }
      }
      
      if (validSubcategoryIds.length !== category.subcategories.length || 
          !category.subcategories.every(id => validSubcategoryIds.some(vId => vId.toString() === id.toString()))) {
        
        await db.collection('categories').updateOne(
          { _id: category._id },
          { $set: { subcategories: validSubcategoryIds } }
        );
        console.log(`Исправлена категория: ${category.name}`);
      }
    }
    
    console.log('База данных исправлена!');
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await client.close();
  }
}

fixDatabase();
