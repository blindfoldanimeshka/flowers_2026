# flower_shop
Здесь будут описываться этапы разработки сайта на HTML+C#

---

# 🌸 Flower Production - Система управления производством цветов

Современная система управления производством и продажей цветов с админ-панелью и клиентской частью.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/atlas)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-black?logo=vercel)](https://vercel.com/)

## 🚀 Технологии

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, MongoDB Atlas
- **Database**: MongoDB с Mongoose
- **Deployment**: Vercel
- **Authentication**: JWT, bcryptjs
- **Tools**: ESLint, Prettier, Husky

## 📋 Быстрый старт

### 🚀 Автоматическая настройка (рекомендуется)
```bash
# Клонируйте репозиторий
git clone <your-repo-url>
cd flower-production

# Автоматическая настройка (установка зависимостей, создание .env, проверки)
npm install
```

### 🔧 Ручная настройка
```bash
# 1. Установка зависимостей
npm install

# 2. Настройка переменных окружения
cp env.example .env.local

# 3. Генерация секретов
npm run generate-secrets

# 4. Проверка настроек
npm run setup
```

### 2. Настройка переменных окружения
Создайте файл `.env.local`:
```env
# MongoDB Atlas (обязательно для Vercel)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flowers_production?retryWrites=true&w=majority

# JWT секреты (сгенерируйте через node generate-secrets.js)
JWT_SECRET=your_generated_jwt_secret_here
SESSION_SECRET=your_generated_session_secret_here

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# Остальные настройки
NODE_ENV=development
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=true
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
```

### 3. Запуск в режиме разработки
```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

## 🗄️ Настройка MongoDB Atlas

### 1. Создание кластера
1. Зайдите на [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Создайте бесплатный аккаунт
3. Создайте кластер **M0 Sandbox** (бесплатный)
4. Настройте пользователя базы данных:
   - Username: `admin`
   - Password: сгенерируйте сильный пароль
5. Добавьте IP `0.0.0.0/0` в Network Access
6. Получите строку подключения

### 2. Тестирование подключения
```bash
# Запустите тест подключения к MongoDB Atlas
npm run test:db
```

## 🚀 Деплой на Vercel

### 1. Подготовка
```bash
# Сгенерируйте секреты
node generate-secrets.js

# Закоммитьте изменения
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Настройка Vercel
1. Зайдите на [Vercel Dashboard](https://vercel.com/dashboard)
2. Нажмите "New Project"
3. Подключите GitHub репозиторий
4. Vercel автоматически определит Next.js проект

### 3. Переменные окружения в Vercel
В Vercel Dashboard → Settings → Environment Variables добавьте:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://admin:password@cluster.mongodb.net/flowers_production?retryWrites=true&w=majority

# JWT секреты (сгенерируйте через generate-secrets.js)
JWT_SECRET=your_generated_jwt_secret_here
SESSION_SECRET=your_generated_session_secret_here

# API URL (замените на ваш Vercel домен)
NEXT_PUBLIC_API_URL=https://your-project.vercel.app

# CORS
ALLOWED_ORIGINS=https://your-project.vercel.app

# Остальные настройки
NODE_ENV=production
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

### 4. После деплоя
```bash
# Создайте админа (локально с подключением к Atlas)
node create-admin.js

# Заполните тестовыми данными
npm run db:seed
```

## 🔧 Доступы

### Админ-панель
- **URL**: `НЕВАЖНО`
- **Логин**: `НЕВАЖНО`
- **Пароль**: `НЕВАЖНО`

### API Endpoints
- **Health Check**: `/api/health`
- **Products**: `/api/products`
- **Categories**: `/api/categories`
- **Orders**: `/api/orders`

## 📁 Структура проекта

```
├── app/                    # Next.js App Router
│   ├── (root)/            # Главная страница
│   ├── admin/             # Админ-панель
│   ├── api/               # API Routes
│   ├── client/            # Клиентская часть
│   └── lib/               # Утилиты
├── components/            # Переиспользуемые компоненты
├── hooks/                 # React хуки
├── lib/                   # Общие утилиты
├── models/                # Mongoose модели
├── public/                # Статические файлы
└── scripts/               # Скрипты для управления
```

## 🛠️ Доступные команды

### 🚀 Разработка
```bash
npm run dev                 # Запуск в режиме разработки
npm run build              # Сборка проекта
npm run start              # Запуск продакшен версии
npm run preview            # Предварительный просмотр продакшена
```

### 🔍 Проверки и тестирование
```bash
npm run lint               # Проверка ESLint
npm run lint:fix           # Исправление ESLint ошибок
npm run type-check         # Проверка TypeScript
npm run test               # Запуск тестов
npm run health-check       # Проверка здоровья приложения
```

### 🗄️ База данных
```bash
npm run db:seed            # Заполнение тестовыми данными
npm run db:create-admin    # Создание админа
npm run test:db            # Тест подключения к базе данных
```

### 🔧 Утилиты
```bash
npm run setup              # Автоматическая настройка проекта
npm run generate-secrets   # Генерация JWT секретов
npm run deploy             # Деплой в продакшен
npm run clean              # Очистка кэша
```

### 📦 Управление зависимостями
```bash
npm install                # Установка зависимостей
npm run postinstall        # Автоматическая настройка после установки
```

## 🔧 Troubleshooting

### Проблема: "MongoDB connection failed"
**Решение**: Проверьте MONGODB_URI в переменных окружения

### Проблема: "Build failed"
**Решение**: 
1. Проверьте все зависимости в package.json
2. Убедитесь, что TypeScript ошибки игнорируются

### Проблема: "Images not loading"
**Решение**: Vercel автоматически обработает статические файлы

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `npm run dev`
2. Проверьте health check: `curl http://localhost:3000/api/health`
3. Проверьте переменные окружения
4. Проверьте подключение к базе данных

---

если ты дочитал до сюда ваня - знай, что я покончил с собой.
