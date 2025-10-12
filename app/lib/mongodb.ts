import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Пожалуйста, определите MONGODB_URI в переменных окружения Vercel');
}

// Глобальная переменная для кэширования соединения
let cached = global as any;

if (!cached.mongoose) {
  cached.mongoose = { conn: null, promise: null };
}

/**
 * Функция для подключения к MongoDB Atlas
 */
async function connectDB() {
  if (cached.mongoose.conn) {
    console.log('Используется существующее подключение к MongoDB Atlas');
    return cached.mongoose.conn;
  }

  if (!cached.mongoose.promise) {
    const opts = {
      bufferCommands: false,
      // Для MongoDB Atlas не нужно указывать user/pass отдельно - они в URI
    };

    console.log('Подключение к MongoDB Atlas...');
    cached.mongoose.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('Подключение к MongoDB Atlas успешно установлено');
        return mongoose;
      })
      .catch((error) => {
        console.error('Ошибка подключения к MongoDB Atlas:', error);
        throw error;
      });
  }
  
  cached.mongoose.conn = await cached.mongoose.promise;
  return cached.mongoose.conn;
}

export default connectDB;