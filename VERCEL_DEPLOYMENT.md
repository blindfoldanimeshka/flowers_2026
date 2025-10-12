# 🚀 Деплой на Vercel - Пошаговая инструкция

## 📋 Что нужно сделать:

### 1. **Настройка MongoDB Atlas** (ОБЯЗАТЕЛЬНО)

1. Зайди на [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Создай бесплатный аккаунт
3. Создай новый кластер (выбери бесплатный M0)
4. Создай пользователя базы данных:
   - Username: `admin` (или любой другой)
   - Password: сгенерируй сильный пароль
5. Добавь IP адрес `0.0.0.0/0` в Network Access (для доступа с любого IP)
6. Получи строку подключения:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
   ```

### 2. **Подготовка кода**

1. **Запуши код в GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Проверь, что все файлы на месте:**
   - ✅ `vercel.json` - создан
   - ✅ `next.config.js` - настроен
   - ✅ `package.json` - содержит все зависимости

### 3. **Деплой на Vercel**

1. Зайди на [Vercel Dashboard](https://vercel.com/dashboard)
2. Нажми "New Project"
3. Подключи GitHub репозиторий: `blindfoldanimeshka/flowers_prod`
4. Vercel автоматически определит Next.js проект

### 4. **Настройка переменных окружения в Vercel**

В Vercel Dashboard → Settings → Environment Variables добавь:

```env
# Основные настройки
NODE_ENV=production
PORT=3000

# MongoDB (замени на свои данные)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
MONGO_USER=your_username
MONGO_PASSWORD=your_strong_password
MONGO_DB=your_database

# JWT секреты (сгенерируй сильные ключи)
JWT_SECRET=your_generated_jwt_secret_here
SESSION_SECRET=your_generated_session_secret_here

# API URL (замени на свой домен Vercel)
NEXT_PUBLIC_API_URL=https://your-project.vercel.app

# CORS
ALLOWED_ORIGINS=https://your-project.vercel.app

# Остальные настройки
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
NEXT_DISABLE_FONT_DOWNLOAD=1
NEXT_TELEMETRY_DISABLED=1
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=30000
```

### 5. **Генерация секретов**

Для генерации JWT_SECRET и SESSION_SECRET используй:

```bash
# В терминале
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 6. **Проверка деплоя**

После деплоя проверь:
1. Открой URL проекта
2. Проверь `/api/health` endpoint
3. Проверь подключение к базе данных

## 🔧 Возможные проблемы и решения:

### Проблема: "MongoDB connection failed"
**Решение:** Проверь MONGODB_URI в переменных окружения Vercel

### Проблема: "Build failed"
**Решение:** 
1. Проверь, что все зависимости в package.json
2. Убедись, что TypeScript ошибки игнорируются (уже настроено)

### Проблема: "Images not loading"
**Решение:** Vercel автоматически обработает статические файлы

## 📞 Что нужно от тебя:

1. **Создай MongoDB Atlas кластер** (5 минут)
2. **Запуши код в GitHub** (если еще не сделал)
3. **Дай мне знать, когда будешь готов** - я помогу с настройкой Vercel

## 🎯 После деплоя:

1. Создай админа: `node create-admin.js` (локально с подключением к Atlas)
2. Заполни тестовыми данными: `npm run db:seed`
3. Проверь все функции приложения

---

**Готов помочь с любым шагом!** 🚀

