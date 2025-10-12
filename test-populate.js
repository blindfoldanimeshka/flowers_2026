const mongoose = require('mongoose');
const slugify = require('slugify');

// Подключение к базе данных
async function connectDB() {
  try {
    const mongoUri = 'mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin';
    console.log('Подключаемся к MongoDB...');
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

// Тестирование populate
async function testPopulate() {
  await connectDB();

  try {
    console.log('🔍 Тестируем получение категорий с подкатегориями...\n');

    // Получаем все категории без populate
    console.log('1. Получаем категории БЕЗ populate:');
    const categoriesWithoutPopulate = await Category.find({}).lean();
    console.log('Количество категорий:', categoriesWithoutPopulate.length);
    if (categoriesWithoutPopulate.length > 0) {
      console.log('Первая категория:', JSON.stringify(categoriesWithoutPopulate[0], null, 2));
    }

    console.log('\n2. Получаем категории С populate:');
    const categoriesWithPopulate = await Category.find({}).populate('subcategories').lean();
    console.log('Количество категорий:', categoriesWithPopulate.length);
    if (categoriesWithPopulate.length > 0) {
      console.log('Первая категория с populate:', JSON.stringify(categoriesWithPopulate[0], null, 2));
    }

    console.log('\n3. Получаем все подкатегории отдельно:');
    const allSubcategories = await Subcategory.find({}).lean();
    console.log('Количество подкатегорий:', allSubcategories.length);
    if (allSubcategories.length > 0) {
      console.log('Первая подкатегория:', JSON.stringify(allSubcategories[0], null, 2));
    }

    // Проверим связи
    if (categoriesWithoutPopulate.length > 0 && allSubcategories.length > 0) {
      const firstCategory = categoriesWithoutPopulate[0];
      console.log('\n4. Проверяем связи:');
      console.log('ID подкатегорий в категории:', firstCategory.subcategories);
      
      const matchingSubcategories = allSubcategories.filter(sub => 
        firstCategory.subcategories.some(catSubId => catSubId.toString() === sub._id.toString())
      );
      console.log('Найдено совпадающих подкатегорий:', matchingSubcategories.length);
      if (matchingSubcategories.length > 0) {
        console.log('Совпадающие подкатегории:', matchingSubcategories.map(sub => ({
          id: sub._id,
          name: sub.name,
          categoryId: sub.categoryId
        })));
      }
    }

  } catch (error) {
    console.error('Ошибка при тестировании:', error);
    console.error('Детали ошибки:', error.message);
    if (error.errors) {
      console.error('Ошибки валидации:', error.errors);
    }
  } finally {
    await mongoose.connection.close();
    console.log('\nСоединение с БД закрыто');
  }
}

testPopulate();
