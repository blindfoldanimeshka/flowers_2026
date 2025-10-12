const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Подключаем модель User напрямую из файла
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Хеширование пароля перед сохранением
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Метод для сравнения паролей
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Загружаем переменные окружения
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin';

async function seedDatabase() {
  try {
    console.log('Подключение к MongoDB с URI:', MONGO_URI);
    await mongoose.connect(MONGO_URI, {
      authSource: 'admin'
    });

    console.log('Успешное подключение к MongoDB...');

    // Удаляем возможные старые учетные записи администратора
    const existingAdminNew = await User.findOne({ username: 'AdminFlows' });
    if (existingAdminNew) {
      console.log('Пользователь AdminFlows уже существует. Удаляем его...');
      await User.deleteOne({ username: 'AdminFlows' });
    }
    const existingAdminOld = await User.findOne({ username: 'admin' });
    if (existingAdminOld) {
      console.log('Пользователь admin уже существует. Удаляем его...');
      await User.deleteOne({ username: 'admin' });
    }

    // НЕ хешируем пароль заранее - модель сделает это автоматически
    // Создаем нового пользователя-админа
    const adminUser = new User({
      username: 'AdminFlows',
      email: 'admin@example.com',
      password: 'KMFlAdmin', // Передаем пароль в чистом виде
      role: 'admin',
    });

    await adminUser.save();
    console.log('Пользователь admin успешно создан!');

  } catch (error) {
    console.error('Ошибка при заполнении базы данных:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Отключено от MongoDB.');
  }
}

seedDatabase(); 