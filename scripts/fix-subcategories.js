/**
 * Скрипт для исправления связей между категориями и подкатегориями
 * 
 * Запуск: node scripts/fix-subcategories.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Подключение к базе данных
async function connectDB() {
  try {
    // Используем localhost вместо mongodb
    const mongoUrl = process.env.MONGODB_URI.replace('mongodb://floweradmin:flowerpassword@mongodb:', 'mongodb://floweradmin:flowerpassword@localhost:');
    console.log('URL подключения:', mongoUrl);
    
    await mongoose.connect(mongoUrl);
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

// Функция для исправления связей
async function fixSubcategoryLinks() {
  try {
    // Получаем все категории
    const categories = await Category.find();
    console.log(`Найдено ${categories.length} категорий`);

    // Получаем все подкатегории
    const subcategories = await Subcategory.find();
    console.log(`Найдено ${subcategories.length} подкатегорий`);

    // Создаем карту подкатегорий по categoryId
    const subcategoryByCategoryId = new Map();
    subcategories.forEach(sub => {
      const categoryId = sub.categoryId.toString();
      if (!subcategoryByCategoryId.has(categoryId)) {
        subcategoryByCategoryId.set(categoryId, []);
      }
      subcategoryByCategoryId.get(categoryId).push(sub);
    });

    // Обновляем категории
    let updatedCount = 0;
    let errorCount = 0;

    for (const category of categories) {
      try {
        const categoryId = category._id.toString();
        const categorySubcategories = subcategoryByCategoryId.get(categoryId) || [];
        
        console.log(`Категория: ${category.name}, ID: ${categoryId}`);
        console.log(`Текущие подкатегории в категории: ${category.subcategories.length}`);
        console.log(`Найдено подкатегорий, связанных с этой категорией: ${categorySubcategories.length}`);
        
        // Проверяем, нужно ли обновлять категорию
        const subcategoryIds = new Set(categorySubcategories.map(sub => sub._id.toString()));
        const currentIds = new Set(category.subcategories.map(id => id.toString()));
        
        // Сравниваем множества
        let needsUpdate = false;
        
        // Проверяем, есть ли подкатегории, которые не добавлены в категорию
        for (const id of subcategoryIds) {
          if (!currentIds.has(id)) {
            console.log(`Подкатегория ${id} не добавлена в категорию ${category.name}`);
            needsUpdate = true;
          }
        }
        
        // Проверяем, есть ли ID в категории, которым не соответствуют подкатегории
        for (const id of currentIds) {
          if (!subcategoryIds.has(id)) {
            console.log(`ID ${id} в категории ${category.name} не соответствует ни одной подкатегории`);
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          console.log(`Обновляем категорию ${category.name}`);
          
          // Обновляем категорию
          category.subcategories = categorySubcategories.map(sub => sub._id);
          await category.save();
          
          console.log(`Категория ${category.name} обновлена. Новое количество подкатегорий: ${category.subcategories.length}`);
          updatedCount++;
        } else {
          console.log(`Категория ${category.name} не требует обновления`);
        }
      } catch (err) {
        console.error(`Ошибка при обновлении категории ${category.name}:`, err);
        errorCount++;
      }
    }

    console.log(`Исправление связей завершено. Обновлено: ${updatedCount}, ошибок: ${errorCount}`);
  } catch (err) {
    console.error('Ошибка при исправлении связей:', err);
  }
}

// Запуск функции исправления
async function run() {
  await connectDB();
  await fixSubcategoryLinks();
  process.exit(0);
}

run(); 