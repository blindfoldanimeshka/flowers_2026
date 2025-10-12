const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Подключение к MongoDB
const MONGO_URI = 'mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin';

// Определение схемы пользователя
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
}, { timestamps: true });

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

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    console.log('Подключение к MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Успешное подключение к MongoDB');

    // Удаляем существующего пользователя
    await User.deleteOne({ username: 'AdminFlows' });
    console.log('Удалены существующие пользователи AdminFlows');

    // Создаем нового администратора
    const adminUser = new User({
      username: 'AdminFlows',
      email: 'admin@floramix.com',
      password: 'KMFlAdmin', // Пароль будет автоматически захеширован
      role: 'admin'
    });

    await adminUser.save();
    console.log('Администратор создан успешно!');
    console.log('Логин: AdminFlows');
    console.log('Пароль: KMFlAdmin');

    // Проверяем, что пользователь создан
    const createdUser = await User.findOne({ username: 'AdminFlows' });
    console.log('Проверка создания пользователя:', createdUser ? 'Успешно' : 'Ошибка');

    // Тестируем пароль
    const isValid = await createdUser.comparePassword('KMFlAdmin');
    console.log('Проверка пароля:', isValid ? 'Успешно' : 'Ошибка');

  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Отключено от MongoDB');
  }
}

createAdmin();