# 🚀 Пошаговый деплой на Vercel

## 📋 Что нужно сделать ПРЯМО СЕЙЧАС:

### 1. 🔐 Настрой MongoDB Atlas (5 минут)

#### Шаг 1: Создай аккаунт
1. Иди на [MongoDB Atlas](https://cloud.mongodb.com/)
2. Зарегистрируйся (бесплатно)
3. Создай новый проект "Flower Production"

#### Шаг 2: Создай кластер
1. Нажми "Create Cluster"
2. Выбери "M0 Sandbox" (бесплатный)
3. Выбери регион (ближайший к тебе)
4. Нажми "Create Cluster"

#### Шаг 3: Настрой доступ
1. В разделе "Network Access" нажми "Add IP Address"
2. Выбери "Allow Access from Anywhere" (0.0.0.0/0)
3. Нажми "Confirm"

#### Шаг 4: Создай пользователя
1. В разделе "Database Access" нажми "Add New Database User"
2. Username: `floweradmin`
3. Password: сгенерируй сложный пароль (сохрани!)
4. Нажми "Add User"

#### Шаг 5: Получи строку подключения
1. Нажми "Connect" на кластере
2. Выбери "Connect your application"
3. Скопируй строку подключения
4. Замени `<password>` на твой пароль
5. Замени `<dbname>` на `flowers_production`

**Пример строки:**
```
mongodb+srv://floweradmin:твой_пароль@cluster0.xxxxx.mongodb.net/flowers_production?retryWrites=true&w=majority
```

---

### 2. 🔑 Сгенерируй секреты (2 минуты)

```bash
# В папке проекта выполни:
npm run generate-secrets
```

Или сгенерируй вручную:
```bash
# JWT Secret (64 символа)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Session Secret (64 символа)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# NextAuth Secret (32 символа)
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

---

### 3. 🚀 Деплой на Vercel (3 минуты)

#### Способ A: Через Vercel CLI (быстро)

```bash
# Установи Vercel CLI
npm i -g vercel

# Войди в аккаунт
vercel login

# Деплой проекта
vercel
```

#### Способ B: Через GitHub (автоматически)

1. Зайди на [Vercel Dashboard](https://vercel.com/dashboard)
2. Нажми "New Project"
3. Подключи GitHub репозиторий
4. Нажми "Deploy"

---

### 4. ⚙️ Настрой переменные окружения

В настройках проекта Vercel добавь:

```env
# MongoDB (замени на свою строку)
MONGODB_URI=mongodb+srv://floweradmin:твой_пароль@cluster0.xxxxx.mongodb.net/flowers_production?retryWrites=true&w=majority

# JWT Secrets (замени на сгенерированные)
JWT_SECRET=твой_jwt_secret_64_символа
SESSION_SECRET=твой_session_secret_64_символа
NEXTAUTH_SECRET=твой_nextauth_secret_32_символа

# API URLs (замени на твой домен)
NEXT_PUBLIC_API_URL=https://твой-проект.vercel.app
NEXTAUTH_URL=https://твой-проект.vercel.app

# Production
NODE_ENV=production
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false

# CORS (замени на твой домен)
ALLOWED_ORIGINS=https://твой-проект.vercel.app,https://www.твой-проект.vercel.app

# Security
NEXT_DISABLE_FONT_DOWNLOAD=1
NEXT_TELEMETRY_DISABLED=1
```

---

### 5. 🧪 Проверь деплой

```bash
# Проверь здоровье
curl https://твой-проект.vercel.app/api/health

# Должен вернуть: {"status":"ok","timestamp":"..."}
```

---

## 🎯 Быстрый старт (всего 10 минут!)

### 1. MongoDB Atlas (5 мин)
- Регистрация → Создание кластера → Настройка доступа → Получение строки

### 2. Генерация секретов (1 мин)
```bash
npm run generate-secrets
```

### 3. Деплой на Vercel (2 мин)
```bash
npm i -g vercel
vercel login
vercel
```

### 4. Настройка переменных (2 мин)
- Скопируй все переменные из примера выше
- Вставь в настройки Vercel

### 5. Проверка (1 мин)
- Открой сайт
- Проверь админ-панель
- Проверь API

---

## 🚨 Если что-то не работает:

### Ошибка MongoDB:
- Проверь строку подключения
- Убедись, что IP добавлен в Network Access
- Проверь имя пользователя и пароль

### Ошибка JWT:
- Убедись, что JWT_SECRET установлен
- Сгенерируй новый секрет
- Перезапусти деплой

### Ошибка CORS:
- Обнови ALLOWED_ORIGINS
- Проверь NEXTAUTH_URL
- Убедись, что домен правильный

---

## 🎉 Готово!

После выполнения всех шагов у тебя будет:
- ✅ Рабочий сайт на Vercel
- ✅ Подключенная MongoDB Atlas
- ✅ Админ-панель
- ✅ API endpoints
- ✅ Автоматический деплой при пуше в GitHub

**Время выполнения: 10 минут** ⏱️
