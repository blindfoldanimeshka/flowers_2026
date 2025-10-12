const mongoose = require('mongoose');

// Подключение к базе данных
async function testCategory() {
  try {
    await mongoose.connect('mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin');
    console.log('Connected to MongoDB');
    
    // Проверяем текущие категории
    const Category = mongoose.model('Category', new mongoose.Schema({
      id: { type: Number, unique: true },
      name: { type: String, unique: true },
      slug: { type: String, unique: true },
      subcategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory' }]
    }, { timestamps: true }));
    
    const existingCategories = await Category.find({});
    console.log('Existing categories:', existingCategories);
    
    // Пытаемся создать новую категорию
    const testName = 'Новая тестовая категория';
    const existingByName = await Category.findOne({
      name: { $regex: new RegExp(`^${testName}$`, 'i') }
    });
    
    console.log('Existing category with same name:', existingByName);
    
    if (!existingByName) {
      const newCategory = new Category({
        id: 2,
        name: testName,
        slug: 'novaya-testovaya-kategoriya',
        subcategories: []
      });
      
      const saved = await newCategory.save();
      console.log('New category created:', saved);
    } else {
      console.log('Category already exists');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testCategory();
