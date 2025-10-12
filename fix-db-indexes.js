const mongoose = require('mongoose');

async function fixIndexes() {
  try {
    await mongoose.connect('mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Проверяем индексы коллекции categories
    console.log('\n=== Existing indexes in categories collection ===');
    const indexes = await db.collection('categories').indexes();
    console.log(JSON.stringify(indexes, null, 2));
    
    // Проверяем документы в коллекции
    console.log('\n=== Documents in categories collection ===');
    const docs = await db.collection('categories').find({}).toArray();
    console.log(JSON.stringify(docs, null, 2));
    
    // Удаляем проблемный индекс
    try {
      console.log('\n=== Dropping problematic index ===');
      await db.collection('categories').dropIndex('subcategories.slug_1');
      console.log('Dropped subcategories.slug_1 index');
    } catch (error) {
      console.log('Index subcategories.slug_1 does not exist or cannot be dropped:', error.message);
    }
    
    // Удаляем все индексы кроме _id_
    try {
      console.log('\n=== Dropping all indexes except _id_ ===');
      const allIndexes = await db.collection('categories').indexes();
      for (const index of allIndexes) {
        if (index.name !== '_id_') {
          try {
            await db.collection('categories').dropIndex(index.name);
            console.log(`Dropped index: ${index.name}`);
          } catch (err) {
            console.log(`Could not drop index ${index.name}:`, err.message);
          }
        }
      }
    } catch (error) {
      console.log('Error dropping indexes:', error.message);
    }
    
    // Проверяем индексы после очистки
    console.log('\n=== Indexes after cleanup ===');
    const indexesAfter = await db.collection('categories').indexes();
    console.log(JSON.stringify(indexesAfter, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixIndexes();
