const mongoose = require('mongoose');

async function testDuplicateLogic() {
  try {
    await mongoose.connect('mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin');
    console.log('Connected to MongoDB');
    
    // Определяем схему так же, как в коде
    const CategorySchema = new mongoose.Schema({
      id: { type: Number, unique: true },
      name: { type: String, unique: true },
      slug: { type: String, unique: true },
      subcategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory' }]
    }, { timestamps: true });
    
    const Category = mongoose.model('Category', CategorySchema);
    
    // Получаем все категории
    const allCategories = await Category.find({});
    console.log('\n=== All categories ===');
    allCategories.forEach(cat => {
      console.log(`ID: ${cat.id}, Name: "${cat.name}", Slug: "${cat.slug}"`);
    });
    
    // Тестируем название "Писюнярик"
    const testName = 'Писюнярик';
    console.log(`\n=== Testing name: "${testName}" ===`);
    
    // Создаем такой же запрос, как в API
    const existingByName = await Category.findOne({
      name: { $regex: new RegExp(`^${testName.trim()}$`, 'i') }
    });
    
    console.log('Existing by name check result:', existingByName);
    
    // Проверим также со старой логикой
    const existing = await Category.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${testName}$`, 'i') } },
        { slug: 'pisyunyarik' } // предполагаемый slug
      ]
    });
    
    console.log('Existing by old logic:', existing);
    
    // Проверяем все схожие названия
    const similarNames = await Category.find({
      name: { $regex: new RegExp(testName, 'i') }
    });
    
    console.log('Similar names:', similarNames);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testDuplicateLogic();
