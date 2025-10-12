# 🗄️ Настройка MongoDB Atlas для проекта

## 📋 Пошаговая инструкция

### 1. **Регистрация в MongoDB Atlas**

1. Перейди на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Нажми **"Try Free"** или **"Start Free"**
3. Заполни форму регистрации:
   - Email: твой email
   - Password: сильный пароль
   - Full Name: твое имя
4. Подтверди email

### 2. **Создание кластера**

1. После входа нажми **"Build a Database"**
2. Выбери **"M0 Sandbox"** (бесплатный):
   - ✅ **Shared Clusters**
   - ✅ **M0 Sandbox** (512 MB Storage)
   - ✅ **Free forever**
3. Выбери **регион** (рекомендую ближайший к тебе)
4. Нажми **"Create Cluster"**

### 3. **Настройка пользователя базы данных**

1. В разделе **"Database Access"** нажми **"Add New Database User"**
2. Настройки пользователя:
   - **Authentication Method**: Password
   - **Username**: `admin` (или любой другой)
   - **Password**: сгенерируй сильный пароль (сохрани его!)
   - **Database User Privileges**: **"Read and write to any database"**
3. Нажми **"Add User"**

### 4. **Настройка сетевого доступа**

1. В разделе **"Network Access"** нажми **"Add IP Address"**
2. Выбери **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Это безопасно для разработки
   - Для продакшена можно ограничить IP
3. Нажми **"Confirm"**

### 5. **Получение строки подключения**

1. Нажми **"Connect"** на главной странице кластера
2. Выбери **"Connect your application"**
3. Настройки:
   - **Driver**: Node.js
   - **Version**: 4.1 or later
4. Скопируй строку подключения:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 6. **Настройка для твоего проекта**

Замени в строке подключения:
- `<username>` → твой username (например, `admin`)
- `<password>` → твой password
- Добавь название базы данных в конце:
  ```
  mongodb+srv://admin:your_password@cluster0.xxxxx.mongodb.net/flowers_production?retryWrites=true&w=majority
  ```

## 🔧 Переменные окружения для Vercel

Создай эти переменные в Vercel Dashboard:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://admin:your_password@cluster0.xxxxx.mongodb.net/flowers_production?retryWrites=true&w=majority
MONGO_USER=admin
MONGO_PASSWORD=your_password
MONGO_DB=flowers_production

# JWT секреты (сгенерируй новые)
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

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

## 🎯 Что делать дальше:

1. **Создай кластер** (5-10 минут)
2. **Получи строку подключения**
3. **Дай мне знать** - я помогу с настройкой Vercel

## ❓ Возможные проблемы:

### "Authentication failed"
- Проверь username и password
- Убедись, что пользователь создан правильно

### "Network access denied"
- Проверь, что IP 0.0.0.0/0 добавлен в Network Access
- Подожди 2-3 минуты после добавления IP

### "Connection timeout"
- Проверь строку подключения
- Убедись, что кластер запущен (может занять несколько минут)

---

**Готов помочь на любом этапе!** 🚀

