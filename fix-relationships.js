const mongoose = require('mongoose');

// Полные схемы для корректной работы
const categorySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, unique: true },
  subcategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory' }],
}, { timestamps: true });

const subcategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
}, { timestamps: true });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Subcategory = mongoose.models.Subcategory || mongoose.model('Subcategory', subcategorySchema);


async function fixRelationships() {
  const mongoUri = 'mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin';
  
  try {
    console.log('Подключаемся к MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Подключение успешно.');

    // Получаем все подкатегории
    const allSubcategories = await Subcategory.find({});
    console.log(`Найдено ${allSubcategories.length} подкатегорий.`);

    let updatedCategories = 0;

    // Группируем подкатегории по categoryId
    const subcategoriesByCategory = {};
    allSubcategories.forEach(subcategory => {
      const categoryId = subcategory.categoryId.toString();
      if (!subcategoriesByCategory[categoryId]) {
        subcategoriesByCategory[categoryId] = [];
      }
      subcategoriesByCategory[categoryId].push(subcategory._id);
    });

    // Обновляем каждую категорию
    for (const categoryId in subcategoriesByCategory) {
      const subcategoryIds = subcategoriesByCategory[categoryId];
      
      const category = await Category.findById(categoryId);
      if (category) {
        // Добавляем недостающие подкатегории в категорию
        const existingIds = category.subcategories.map(id => id.toString());
        const newIds = subcategoryIds.filter(id => !existingIds.includes(id.toString()));
        
        if (newIds.length > 0) {
          category.subcategories.push(...newIds);
          await category.save();
          console.log(`- В категорию "${category.name}" добавлено ${newIds.length} подкатегорий.`);
          updatedCategories++;
        }
      }
    }
    
    if (updatedCategories > 0) {
      console.log(`\n✅ Готово! Обновлено ${updatedCategories} категорий.`);
    } else {
      console.log('\n✅ Все связи уже корректны.');
    }

  } catch (error) {
    console.error('💥 Произошла ошибка:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Соединение с БД закрыто.');
  }
}

fixRelationships();
