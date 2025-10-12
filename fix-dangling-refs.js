
const mongoose = require('mongoose');

// Определяем только нужные модели для скрипта
const categorySchema = new mongoose.Schema({
  subcategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory' }],
});

const subcategorySchema = new mongoose.Schema({
  name: String, // Добавим хоть одно поле, чтобы модель была валидной
});

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Subcategory = mongoose.models.Subcategory || mongoose.model('Subcategory', subcategorySchema);


async function fixDanglingReferences() {
  const mongoUri = 'mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin';
  
  try {
    console.log('Подключаемся к MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Подключение успешно.');

    const categories = await Category.find({});
    console.log(`Найдено ${categories.length} категорий для проверки.`);

    let refsRemovedCount = 0;

    for (const category of categories) {
      const originalCount = category.subcategories.length;
      const existingSubcategoryIds = new Set();

      // Находим только существующие подкатегории
      const foundSubcategories = await Subcategory.find({
        '_id': { $in: category.subcategories }
      }).select('_id');
      
      foundSubcategories.forEach(sub => existingSubcategoryIds.add(sub._id.toString()));

      // Фильтруем массив, оставляя только ID существующих подкатегорий
      const correctedSubcategories = category.subcategories.filter(subId => 
        existingSubcategoryIds.has(subId.toString())
      );
      
      const removedCount = originalCount - correctedSubcategories.length;

      if (removedCount > 0) {
        category.subcategories = correctedSubcategories;
        await category.save();
        console.log(`- Из категории (ID: ${category._id}) удалено ${removedCount} недействительных ссылок.`);
        refsRemovedCount += removedCount;
      }
    }
    
    if (refsRemovedCount > 0) {
      console.log(`\n✅ Готово! Всего удалено ${refsRemovedCount} недействительных ссылок.`);
    } else {
      console.log('\n✅ Проверка завершена. Недействительных ссылок не найдено.');
    }

  } catch (error) {
    console.error('💥 Произошла ошибка:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Соединение с БД закрыто.');
  }
}

fixDanglingReferences();

