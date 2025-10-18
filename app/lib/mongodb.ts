import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  console.warn('MONGODB_URI не определена. Подключение к базе данных будет пропущено.');
}

// Глобальная переменная для кэширования соединения
const cached = global as any;

if (!cached.mongoose) {
  cached.mongoose = { conn: null, promise: null };
}

/**
 * Функция для подключения к MongoDB Atlas
 */
async function connectDB() {
  // Если MONGODB_URI не определена, возвращаем null
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI не определена. Подключение к базе данных пропущено.');
    return null;
  }

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