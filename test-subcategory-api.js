const fetch = require('node-fetch');

async function testSubcategoryAPI() {
  const baseUrl = 'http://localhost:3000/api';
  
  try {
    console.log('🔍 Получаем список категорий...');
    const categoriesResponse = await fetch(`${baseUrl}/categories`);
    const categories = await categoriesResponse.json();
    
    console.log('📋 Найдено категорий:', categories.length);
    
    if (categories.length === 0) {
      console.log('❌ Нет категорий для тестирования');
      return;
    }
    
    const firstCategory = categories[0];
    console.log('🎯 Используем категорию:', firstCategory.name, 'ID:', firstCategory._id);
    
    // Тестируем создание подкатегории
    console.log('\n🚀 Создаем новую подкатегорию...');
    
    const newSubcategoryData = {
      name: `Тестовая подкатегория ${Date.now()}`,
      categoryId: firstCategory._id,
      description: 'Это тестовая подкатегория'
    };
    
    console.log('📝 Данные для создания:', newSubcategoryData);
    
    const createResponse = await fetch(`${baseUrl}/subcategories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newSubcategoryData)
    });
    
    const createResult = await createResponse.json();
    
    console.log('📊 Статус ответа:', createResponse.status);
    console.log('📋 Результат создания:', createResult);
    
    if (createResponse.ok) {
      console.log('✅ Подкатегория успешно создана!');
      console.log('🆔 ID подкатегории:', createResult.data._id);
      console.log('🏷️ Slug:', createResult.data.slug);
    } else {
      console.log('❌ Ошибка при создании подкатегории:', createResult.error);
      if (createResult.details) {
        console.log('📋 Детали ошибки:', createResult.details);
      }
    }
    
    // Проверяем, что подкатегория добавилась в категорию
    console.log('\n🔍 Проверяем обновленную категорию...');
    const updatedCategoriesResponse = await fetch(`${baseUrl}/categories`);
    const updatedCategories = await updatedCategoriesResponse.json();
    const updatedCategory = updatedCategories.find(c => c._id === firstCategory._id);
    
    if (updatedCategory && updatedCategory.subcategories) {
      console.log('📊 Количество подкатегорий в категории:', updatedCategory.subcategories.length);
      console.log('📋 Подкатегории:', updatedCategory.subcategories.map(sub => sub.name || sub._id));
    }
    
  } catch (error) {
    console.error('💥 Ошибка при тестировании API:', error.message);
    console.error('📋 Детали:', error);
  }
}

console.log('🧪 Запуск тестирования API подкатегорий...\n');
testSubcategoryAPI();
