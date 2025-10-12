const crypto = require('crypto');

console.log('🔐 Генерация сильных секретов для продакшена\n');

// Генерируем JWT секрет
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET=' + jwtSecret);

// Генерируем сильный пароль для MongoDB
const mongoPassword = crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
console.log('MONGO_PASSWORD=' + mongoPassword);

// Генерируем секрет для сессий
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('SESSION_SECRET=' + sessionSecret);

console.log('\n📝 Скопируйте эти значения в ваш .env файл');
console.log('⚠️  ВАЖНО: Никогда не коммитьте .env файл в репозиторий!');
console.log('📋 Рекомендуемые настройки для .env файла:');
console.log(`
NODE_ENV=production
PORT=3000

# MongoDB
MONGODB_URI=mongodb://your_username:${mongoPassword}@localhost:27017/your_database?authSource=admin
MONGO_USER=your_username
MONGO_PASSWORD=${mongoPassword}
MONGO_DB=your_database

# JWT
JWT_SECRET=${jwtSecret}

# API
NEXT_PUBLIC_API_URL=https://your-domain.com

# Безопасность
SESSION_SECRET=${sessionSecret}

# Логирование
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false

# CORS
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# Production
NEXT_DISABLE_FONT_DOWNLOAD=1
NEXT_TELEMETRY_DISABLED=1

# Monitoring
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=30000
`);
