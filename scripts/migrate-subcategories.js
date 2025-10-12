/**
 * Скрипт для миграции подкатегорий - добавление поля categoryNumId
 * 
 * Запуск: node scripts/migrate-subcategories.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Подключение к базе данных
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB подключена');
  } catch (err) {
    console.error('Ошибка подключения к MongoDB:', err);
    process.exit(1);
  }
}

// Определение схемы категории
const categorySchema = new mongoose.Schema({
  id: Number,
  name: String,
  slug: String,
  subcategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory' }]
});

// Определение схемы подкатегории
const subcategorySchema = new mongoose.Schema({
  name: String,
  slug: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  categoryNumId: Number,
  description: String,
  image: String,
  isActive: Boolean
});

// Создание моделей
const Category = mongoose.model('Category', categorySchema);
const Subcategory = mongoose.model('Subcategory', subcategorySchema);

// Функция миграции
async function migrateSubcategories() {
  try {
    // Получаем все категории
    const categories = await Category.find();
    console.log(`Найдено ${categories.length} категорий`);

    // Создаем карту категорий для быстрого доступа
    const categoryMap = new Map();
    categories.forEach(category => {
      categoryMap.set(category._id.toString(), category.id);
    });

    // Получаем все подкатегории
    const subcategories = await Subcategory.find();
    console.log(`Найдено ${subcategories.length} подкатегорий`);

    // Обновляем подкатегории
    let updatedCount = 0;
    let errorCount = 0;

    for (const subcategory of subcategories) {
      try {
        const categoryId = subcategory.categoryId.toString();
        const categoryNumId = categoryMap.get(categoryId);

        if (categoryNumId) {
          subcategory.categoryNumId = categoryNumId;
          await subcategory.save();
          updatedCount++;
          console.log(`Обновлена подкатегория: ${subcategory.name}, categoryNumId: ${categoryNumId}`);
        } else {
          console.error(`Не найден числовой ID для категории с _id: ${categoryId}`);
          errorCount++;
        }
      } catch (err) {
        console.error(`Ошибка при обновлении подкатегории ${subcategory.name}:`, err);
        errorCount++;
      }
    }

    console.log(`Миграция завершена. Обновлено: ${updatedCount}, ошибок: ${errorCount}`);
  } catch (err) {
    console.error('Ошибка при миграции:', err);
  }
}

// Запуск миграции
async function run() {
  await connectDB();
  await migrateSubcategories();
  process.exit(0);
}

run(); 