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
  console.warn('MONGODB_URI не определена. Подключение к базе данных будет пропущено.');
}

// Переменная для кэширования соединения
const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function connect() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }

  console.log('connect() called');
  if (cached.conn) {
    console.log('Using cached connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const options: ConnectOptions = {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    };
    console.log('Connecting to MongoDB with options:', options);
    mongoose.set('bufferCommands', false);
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
