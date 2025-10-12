/**
 * Скрипт для миграции продуктов - добавление полей categoryNumId и subcategoryNumId
 * 
 * Запуск: node scripts/migrate-products.js
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

// Определение схем
const categorySchema = new mongoose.Schema({
  id: Number,
  name: String,
  slug: String,
  subcategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory' }]
});

const subcategorySchema = new mongoose.Schema({
  name: String,
  slug: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  categoryNumId: Number,
  description: String,
  image: String,
  isActive: Boolean
});

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  categoryNumId: Number,
  subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory' },
  subcategoryNumId: Number,
  image: String,
  description: String,
  inStock: Boolean
}, {
  timestamps: true
});

// Создание моделей
const Category = mongoose.model('Category', categorySchema);
const Subcategory = mongoose.model('Subcategory', subcategorySchema);
const Product = mongoose.model('Product', productSchema);

// Функция миграции
async function migrateProducts() {
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

    // Создаем карту подкатегорий для быстрого доступа
    const subcategoryMap = new Map();
    subcategories.forEach(subcategory => {
      subcategoryMap.set(subcategory._id.toString(), {
        categoryNumId: subcategory.categoryNumId || categoryMap.get(subcategory.categoryId.toString())
      });
    });

    // Получаем все продукты
    const products = await Product.find();
    console.log(`Найдено ${products.length} продуктов`);

    // Обновляем продукты
    let updatedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        let updated = false;

        // Устанавливаем числовой ID категории
        if (product.categoryId && !product.categoryNumId) {
          const categoryId = product.categoryId.toString();
          const categoryNumId = categoryMap.get(categoryId);

          if (categoryNumId) {
            product.categoryNumId = categoryNumId;
            updated = true;
            console.log(`Установлен categoryNumId: ${categoryNumId} для продукта: ${product.name}`);
          } else {
            console.error(`Не найден числовой ID для категории с _id: ${categoryId}`);
          }
        }

        // Устанавливаем числовой ID подкатегории
        if (product.subcategoryId && !product.subcategoryNumId) {
          const subcategoryId = product.subcategoryId.toString();
          const subcategoryData = subcategoryMap.get(subcategoryId);

          if (subcategoryData && subcategoryData.categoryNumId) {
            product.subcategoryNumId = subcategoryData.categoryNumId;
            updated = true;
            console.log(`Установлен subcategoryNumId: ${subcategoryData.categoryNumId} для продукта: ${product.name}`);
          } else {
            console.error(`Не найден числовой ID для подкатегории с _id: ${subcategoryId}`);
          }
        }

        if (updated) {
          await product.save();
          updatedCount++;
        }
      } catch (err) {
        console.error(`Ошибка при обновлении продукта ${product.name}:`, err);
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
  await migrateProducts();
  process.exit(0);
}

run(); 