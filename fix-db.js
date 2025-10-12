
const mongoose = require('mongoose');
const slugify = require('slugify');

// Модели, чтобы скрипт был самодостаточным
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
mongoose.models.Subcategory || mongoose.model('Subcategory', subcategorySchema);


async function fixSubcategoryData() {
  const mongoUri = 'mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin';
  
  try {
    console.log('Подключаемся к MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Подключение успешно.');

    const categories = await Category.find({});
    console.log(`Найдено ${categories.length} категорий для проверки.`);

    let categoriesUpdated = 0;

    for (const category of categories) {
      let needsUpdate = false;
      // Преобразуем массив, извлекая ID, если элемент является объектом
      const correctedSubcategories = category.subcategories.map(sub => {
        if (sub && typeof sub === 'object' && sub._id) {
          needsUpdate = true;
          return sub._id;
        }
        return sub; // Уже в правильном формате (ObjectId)
      }).filter(Boolean); // Удаляем возможные null/undefined

      if (needsUpdate) {
        category.subcategories = correctedSubcategories;
        await category.save();
        console.log(`- Категория "${category.name}" (ID: ${category._id}) была исправлена.`);
        categoriesUpdated++;
      }
    }
    
    if (categoriesUpdated > 0) {
      console.log(`\n✅ Готово! Исправлено ${categoriesUpdated} категорий.`);
    } else {
      console.log('\n✅ Данные уже в корректном формате. Ничего исправлять не нужно.');
    }

  } catch (error) {
    console.error('💥 Произошла ошибка:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Соединение с БД закрыто.');
  }
}

fixSubcategoryData();

