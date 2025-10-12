# 🚀 Инструкция по деплою в продакшен

## 📋 Подготовка к продакшену

### 1. Генерация сильных секретов

```bash
npm run generate-secrets
```

Скопируйте сгенерированные значения в ваш `.env` файл.

### 2. Настройка переменных окружения

Создайте файл `.env` со следующими переменными:

```env
# ===== ОСНОВНЫЕ НАСТРОЙКИ =====
NODE_ENV=production
PORT=3000

# ===== MONGODB НАСТРОЙКИ =====
MONGODB_URI=mongodb://your_username:your_password@your_host:27017/your_database?authSource=admin
MONGO_USER=your_username
MONGO_PASSWORD=your_strong_password
MONGO_DB=your_database

# ===== JWT НАСТРОЙКИ =====
JWT_SECRET=your_generated_jwt_secret

# ===== API НАСТРОЙКИ =====
NEXT_PUBLIC_API_URL=https://your-domain.com

# ===== БЕЗОПАСНОСТЬ =====
SESSION_SECRET=your_generated_session_secret

# ===== ЛОГИРОВАНИЕ =====
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false

# ===== CORS НАСТРОЙКИ =====
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# ===== RATE LIMITING =====
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===== UPLOAD НАСТРОЙКИ =====
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# ===== ПРОДАКШЕН НАСТРОЙКИ =====
NEXT_DISABLE_FONT_DOWNLOAD=1
NEXT_TELEMETRY_DISABLED=1

# ===== МОНИТОРИНГ =====
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=30000

# ===== BACKUP НАСТРОЙКИ =====
BACKUP_DIR=./backups
MAX_BACKUPS=7
```

### 3. Проверка кода

```bash
npm run lint
npm run build
```

### 4. Тестирование

```bash
# Запуск в production режиме локально
npm run build
npm start

# Проверка health check
npm run health-check
```

## 🐳 Деплой с Docker

### 1. Сборка и запуск

```bash
# Сборка и запуск всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f app
```

### 2. Инициализация базы данных

```bash
# Создание админа
node create-admin.js

# Заполнение тестовыми данными (опционально)
npm run db:seed
```

### 3. Настройка бэкапов

```bash
# Создание первого бэкапа
npm run backup:create

# Настройка автоматических бэкапов (cron)
# Добавьте в crontab:
# 0 2 * * * cd /path/to/your/app && npm run backup:create
```

## ☁️ Деплой на облачные платформы

### Vercel

1. Подключите репозиторий к Vercel
2. Настройте переменные окружения в Vercel Dashboard
3. Настройте MongoDB Atlas или другой MongoDB хостинг
4. Деплой произойдет автоматически при push в main ветку

### Railway

1. Подключите репозиторий к Railway
2. Добавьте MongoDB сервис
3. Настройте переменные окружения
4. Railway автоматически деплоит при изменениях

### DigitalOcean App Platform

1. Создайте новое приложение в DigitalOcean
2. Подключите репозиторий
3. Настройте переменные окружения
4. Добавьте MongoDB сервис

### AWS/GCP/Azure

Используйте Docker контейнеры с docker-compose или Kubernetes.

## 🔒 Безопасность

### 1. SSL/HTTPS

- Настройте SSL сертификат (Let's Encrypt)
- Принудительно перенаправляйте HTTP на HTTPS
- Настройте HSTS заголовки

### 2. Firewall

```bash
# Откройте только необходимые порты
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

### 3. MongoDB безопасность

- Используйте сильные пароли
- Ограничьте доступ по IP
- Включите аутентификацию
- Регулярно обновляйте MongoDB

### 4. Мониторинг

```bash
# Проверка health check
curl -f https://your-domain.com/api/health

# Мониторинг логов
docker-compose logs -f app
```

## 📊 Мониторинг и логирование

### 1. Health Check

Приложение предоставляет endpoint `/api/health` для мониторинга:

```bash
curl https://your-domain.com/api/health
```

### 2. Логирование

Логи доступны через:

```bash
# Docker логи
docker-compose logs -f app

# Системные логи
journalctl -u your-app-service -f
```

### 3. Метрики

Настройте мониторинг:
- Uptime Robot для проверки доступности
- Sentry для отслеживания ошибок
- Google Analytics для аналитики

## 🔄 CI/CD

### GitHub Actions

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          # Ваши команды деплоя
```

## 🚨 Troubleshooting

### Проблемы с подключением к MongoDB

```bash
# Проверка подключения
node scripts/test-db-connection.js

# Проверка переменных окружения
echo $MONGODB_URI
```

### Проблемы с загрузкой изображений

```bash
# Проверка прав доступа
ls -la public/uploads/

# Пересоздание директории
mkdir -p public/uploads
chmod 755 public/uploads
```

### Проблемы с производительностью

```bash
# Проверка использования ресурсов
docker stats

# Очистка кэша
docker system prune -f
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose logs -f app`
2. Проверьте health check: `curl https://your-domain.com/api/health`
3. Проверьте переменные окружения
4. Проверьте подключение к базе данных

## 🔄 Обновления

### Обновление приложения

```bash
# Остановка сервисов
docker-compose down

# Обновление кода
git pull origin main

# Пересборка и запуск
docker-compose up -d --build

# Проверка
npm run health-check
```

### Обновление базы данных

```bash
# Создание бэкапа перед обновлением
npm run backup:create

# Применение миграций (если есть)
# node scripts/migrate-database.js

# Проверка целостности данных
npm run db:seed
```
