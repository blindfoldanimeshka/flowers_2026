import mongoose, { ConnectOptions } from 'mongoose';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

// Получаем URL подключения к MongoDB
let MONGODB_URI = process.env.MONGODB_URI;

// Проверяем, запущено ли приложение вне Docker
if (MONGODB_URI && MONGODB_URI.includes('@mongodb:')) {
  // Если приложение запущено вне Docker, заменяем mongodb на localhost
  const isRunningLocally = process.env.NODE_ENV === 'development' && typeof window === 'undefined';
  if (isRunningLocally) {
    MONGODB_URI = MONGODB_URI.replace('@mongodb:', '@localhost:');
    console.log('Используем локальный URL для MongoDB:', MONGODB_URI);
  }
}

// MONGODB_URI скрыт для безопасности

if (!MONGODB_URI) {
  throw new Error('Пожалуйста, определите MONGODB_URI в файле .env');
}

// Переменная для кэширования соединения
const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function connect() {
  console.log('connect() called');
  if (cached.conn) {
    console.log('Using cached connection');
    return cached.conn;
  }

  if (!cached.promise) {
    // Настройки для MongoDB в Docker
    const options: ConnectOptions = {
      authSource: 'admin'
    };
    console.log('Connecting to MongoDB with options:', options);
    // MongoDB URI скрыт для безопасности
    cached.promise = mongoose.connect(MONGODB_URI as string, options).then((mongooseInstance) => {
      console.log('Подключено к MongoDB');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('Ошибка при подключении к MongoDB:', e);
    throw e;
  }

  return cached.conn;
}

export default connect;