const mongoose = require('mongoose');
const slugify = require('slugify');

// Подключение к базе данных
async function connectDB() {
  try {
    const mongoUri = 'mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin';
    console.log('Подключаемся к MongoDB:', mongoUri.replace(/:\/\/.+@/, '://***:***@'));
    await mongoose.connect(mongoUri);
    console.log('Подключение к MongoDB успешно');
  } catch (error) {
    console.error('Ошибка подключения к MongoDB:', error);
    process.exit(1);
  }
}

// Определяем схемы моделей прямо в файле
const categorySchema = new mongoose.Schema({
  id: {
    type: Number,
    required: [true, 'ID категории обязателен'],
    unique: true,
    validate: {
      validator: (v) => Number.isInteger(v) && v > 0,
      message: (props) => `ID категории должен быть положительным целым числом, получено ${props.value}`,
    },
  },
  name: {
    type: String,
    required: [true, 'Название категории обязательно'],
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
  },
  subcategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory',
  }],
}, {
  timestamps: true,
});

// Pre-save хук для генерации slug
categorySchema.pre('save', function (next) {
  if (!this.slug && this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

const subcategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Название подкатегории обязательно'],
    trim: true,
    maxlength: [100, 'Название подкатегории не может быть длиннее 100 символов']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'ID категории обязателен']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Описание не может быть длиннее 500 символов']
  },
  image: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

subcategorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

subcategorySchema.virtual('id').get(function() {
  return this._id;
});

subcategorySchema.set('toJSON', { virtuals: true });
subcategorySchema.set('toObject', { virtuals: true });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Subcategory = mongoose.models.Subcategory || mongoose.model('Subcategory', subcategorySchema);

// Тестирование создания подкатегории
async function testSubcategoryCreation() {
  await connectDB();

  try {

    console.log('Ищем первую категорию...');
    const category = await Category.findOne();
    
    if (!category) {
      console.log('Категории не найдены, создаем тестовую категорию...');
      const testCategory = new Category({
        id: 1,
        name: 'Тестовая категория',
        slug: 'test-category'
      });
      const savedCategory = await testCategory.save();
      console.log('Создана тестовая категория:', savedCategory);
      
      // Попробуем создать подкатегорию
      console.log('Создаем подкатегорию...');
      const subcategory = new Subcategory({
        name: 'Тестовая подкатегория',
        categoryId: savedCategory._id,
        description: 'Описание тестовой подкатегории'
      });
      
      const savedSubcategory = await subcategory.save();
      console.log('Подкатегория создана успешно:', savedSubcategory);
      
    } else {
      console.log('Найдена категория:', category);
      
      // Попробуем создать подкатегорию
      console.log('Создаем подкатегорию...');
      const subcategory = new Subcategory({
        name: 'Тестовая подкатегория ' + Date.now(),
        categoryId: category._id,
        description: 'Описание тестовой подкатегории'
      });
      
      const savedSubcategory = await subcategory.save();
      console.log('Подкатегория создана успешно:', savedSubcategory);
    }

  } catch (error) {
    console.error('Ошибка при тестировании:', error);
    console.error('Детали ошибки:', error.message);
    if (error.errors) {
      console.error('Ошибки валидации:', error.errors);
    }
  } finally {
    await mongoose.connection.close();
    console.log('Соединение с БД закрыто');
  }
}

testSubcategoryCreation();
