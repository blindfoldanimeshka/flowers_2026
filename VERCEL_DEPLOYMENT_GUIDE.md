# 🚀 Руководство по деплою на Vercel

## 📋 Подготовка к деплою

### 1. 🔐 Настройка MongoDB Atlas

#### Создание кластера:
1. Зайдите на [MongoDB Atlas](https://cloud.mongodb.com/)
2. Создайте новый кластер (бесплатный M0)
3. Настройте сетевой доступ (0.0.0.0/0 для всех IP)
4. Создайте пользователя базы данных
5. Получите строку подключения

#### Пример строки подключения:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/flowers_production?retryWrites=true&w=majority
```

### 2. 🔑 Генерация секретов

```bash
# Генерация JWT секретов
npm run generate-secrets
```

Или вручную:
```bash
# JWT Secret (64 символа)
openssl rand -base64 32

# Session Secret (64 символа)  
openssl rand -base64 32

# NextAuth Secret (32 символа)
openssl rand -base64 24
```

---

## 🚀 Деплой на Vercel

### Способ 1: Через Vercel CLI (рекомендуется)

#### 1. Установка Vercel CLI:
```bash
npm i -g vercel
```

#### 2. Логин в Vercel:
```bash
vercel login
```

#### 3. Деплой проекта:
```bash
# Первый деплой
vercel

# Последующие деплои
vercel --prod
```

### Способ 2: Через GitHub (автоматический)

#### 1. Подключение к GitHub:
1. Зайдите на [Vercel Dashboard](https://vercel.com/dashboard)
2. Нажмите "New Project"
3. Выберите "Import Git Repository"
4. Подключите ваш GitHub репозиторий

#### 2. Настройка переменных окружения:
В настройках проекта добавьте переменные:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flowers_production?retryWrites=true&w=majority

# JWT Secrets
JWT_SECRET=your_generated_jwt_secret_here
SESSION_SECRET=your_generated_session_secret_here
NEXTAUTH_SECRET=your_nextauth_secret_here

# API URL (замените на ваш домен)
NEXT_PUBLIC_API_URL=https://your-project.vercel.app
NEXTAUTH_URL=https://your-project.vercel.app

# Production settings
NODE_ENV=production
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false

# CORS (замените на ваш домен)
ALLOWED_ORIGINS=https://your-project.vercel.app,https://www.your-project.vercel.app

# Security
NEXT_DISABLE_FONT_DOWNLOAD=1
NEXT_TELEMETRY_DISABLED=1
```

---

## ⚙️ Настройка переменных окружения

### 🔑 Обязательные переменные:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flowers_production?retryWrites=true&w=majority

# JWT Secrets (сгенерируйте новые для продакшена)
JWT_SECRET=your_64_character_jwt_secret_here
SESSION_SECRET=your_64_character_session_secret_here
NEXTAUTH_SECRET=your_32_character_nextauth_secret_here

# API URLs (замените на ваш домен)
NEXT_PUBLIC_API_URL=https://your-project.vercel.app
NEXTAUTH_URL=https://your-project.vercel.app

# Production
NODE_ENV=production
```

### 🔧 Дополнительные переменные:

```env
# CORS (ваш домен)
ALLOWED_ORIGINS=https://your-project.vercel.app,https://www.your-project.vercel.app

# Logging
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false

# Security
NEXT_DISABLE_FONT_DOWNLOAD=1
NEXT_TELEMETRY_DISABLED=1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,image/gif
```

---

## 🧪 Тестирование деплоя

### 1. Проверка здоровья:
```bash
# Локальная проверка
npm run health-check

# Проверка на Vercel
curl https://your-project.vercel.app/api/health
```

### 2. Тестирование API:
```bash
# Проверка подключения к БД
curl https://your-project.vercel.app/api/health

# Проверка статистики
curl https://your-project.vercel.app/api/stats
```

### 3. Проверка админ-панели:
1. Откройте `https://your-project.vercel.app/admin`
2. Войдите с учетными данными админа
3. Проверьте функциональность

---

## 🔧 Настройка домена (опционально)

### 1. Покупка домена:
1. Купите домен на любом регистраторе
2. Или используйте бесплатный поддомен Vercel

### 2. Настройка DNS:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A
Name: @
Value: 76.76.19.61
```

### 3. Обновление переменных:
```env
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## 🚨 Troubleshooting

### Проблема: Ошибка подключения к MongoDB
**Решение:**
1. Проверьте строку подключения
2. Убедитесь, что IP адрес добавлен в Network Access
3. Проверьте имя пользователя и пароль

### Проблема: Ошибка JWT
**Решение:**
1. Убедитесь, что JWT_SECRET установлен
2. Сгенерируйте новый секрет
3. Перезапустите деплой

### Проблема: CORS ошибки
**Решение:**
1. Обновите ALLOWED_ORIGINS
2. Проверьте NEXTAUTH_URL
3. Убедитесь, что домен правильный

### Проблема: Ошибки сборки
**Решение:**
1. Проверьте TypeScript ошибки: `npm run type-check`
2. Исправьте ESLint ошибки: `npm run lint:fix`
3. Убедитесь, что все зависимости установлены

---

## 📊 Мониторинг

### 1. Vercel Analytics:
- Автоматически включена
- Показывает производительность
- Отслеживает ошибки

### 2. Логи:
```bash
# Просмотр логов
vercel logs

# Логи конкретного деплоя
vercel logs --deployment-url=https://your-project.vercel.app
```

### 3. Health Check:
```bash
# Проверка здоровья
curl https://your-project.vercel.app/api/health
```

---

## 🎯 Финальная проверка

### ✅ Чек-лист перед деплоем:

- [ ] MongoDB Atlas настроен и доступен
- [ ] Все переменные окружения установлены
- [ ] Секреты сгенерированы и безопасны
- [ ] Локальные тесты проходят
- [ ] TypeScript компилируется без ошибок
- [ ] ESLint не показывает ошибок
- [ ] Домен настроен (если нужен)

### ✅ Чек-лист после деплоя:

- [ ] Сайт открывается
- [ ] API endpoints работают
- [ ] Админ-панель доступна
- [ ] База данных подключается
- [ ] Загрузка файлов работает
- [ ] Аутентификация работает

---

## 🚀 Команды для быстрого деплоя

```bash
# 1. Подготовка
npm run generate-secrets
npm run type-check
npm run lint:fix

# 2. Деплой
vercel --prod

# 3. Проверка
curl https://your-project.vercel.app/api/health
```

**Готово! Ваш проект задеплоен на Vercel!** 🎉
