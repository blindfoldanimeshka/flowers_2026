# 🚀 Настройка MongoDB Atlas для Vercel

## ✅ Что уже сделано:
- Обновлен `app/lib/mongodb.ts` для работы с MongoDB Atlas
- Настроен `vercel.json` с правильными параметрами
- Создан тестовый скрипт `test-atlas-connection.js`

## 📋 Что нужно сделать:

### 1. **Создать MongoDB Atlas кластер** (5 минут)

1. Зайди на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Создай бесплатный аккаунт
3. Создай кластер **M0 Sandbox** (бесплатный)
4. Настрой пользователя базы данных:
   - Username: `admin` (или любой другой)
   - Password: сгенерируй сильный пароль
5. Добавь IP `0.0.0.0/0` в Network Access
6. Получи строку подключения

### 2. **Настроить переменные в Vercel**

В Vercel Dashboard → Settings → Environment Variables добавь:

```env
# MongoDB Atlas (замени на свои данные)
MONGODB_URI=mongodb+srv://admin:your_password@cluster0.xxxxx.mongodb.net/flowers_production?retryWrites=true&w=majority

# JWT секреты (сгенерируй через node generate-secrets.js)
JWT_SECRET=your_generated_jwt_secret_here
SESSION_SECRET=your_generated_session_secret_here

# API URL (замени на свой Vercel домен)
NEXT_PUBLIC_API_URL=https://your-project.vercel.app

# Остальные настройки
NODE_ENV=production
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false
ALLOWED_ORIGINS=https://your-project.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
NEXT_DISABLE_FONT_DOWNLOAD=1
NEXT_TELEMETRY_DISABLED=1
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=30000
```

### 3. **Протестировать подключение**

```bash
# Установи переменную окружения локально
export MONGODB_URI="mongodb+srv://admin:your_password@cluster0.xxxxx.mongodb.net/flowers_production?retryWrites=true&w=majority"

# Запусти тест
node test-atlas-connection.js
```

### 4. **Деплой на Vercel**

1. Запуши код в GitHub
2. Подключи репозиторий к Vercel
3. Добавь все переменные окружения
4. Деплой!

## 🔧 Возможные проблемы:

### "MongoDB connection failed"
- Проверь MONGODB_URI в Vercel Environment Variables
- Убедись, что IP 0.0.0.0/0 добавлен в Network Access
- Проверь username и password

### "Build failed"
- Убедись, что все зависимости в package.json
- Проверь TypeScript ошибки

## 🎯 После успешного деплоя:

1. Создай админа: `node create-admin.js` (локально с подключением к Atlas)
2. Заполни тестовыми данными: `npm run db:seed`
3. Проверь все функции приложения

---

**Готов помочь с любым шагом!** 🚀
