# Настройка переменных окружения в Vercel

## Необходимые переменные окружения

Для корректной работы приложения на Vercel необходимо настроить следующие переменные окружения:

### 1. Основные переменные

```bash
# MongoDB подключение
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flowers_production?retryWrites=true&w=majority

# JWT секрет для аутентификации
JWT_SECRET=your_generated_jwt_secret_here

# API URL приложения
NEXT_PUBLIC_API_URL=https://your-project.vercel.app
```

### 2. Безопасность

```bash
# Разрешенные домены
ALLOWED_ORIGINS=https://your-project.vercel.app,https://www.your-project.vercel.app

# Отключение телеметрии
NEXT_TELEMETRY_DISABLED=1
```

### 3. Опциональные настройки

```bash
# Логирование
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Как настроить в Vercel

1. Перейдите в панель управления Vercel
2. Выберите ваш проект
3. Перейдите в раздел "Settings" → "Environment Variables"
4. Добавьте каждую переменную:
   - **Name**: название переменной (например, `MONGODB_URI`)
   - **Value**: значение переменной
   - **Environment**: выберите "Production", "Preview" и/или "Development"

## Важные замечания

- **MONGODB_URI**: замените `username`, `password` и `cluster` на ваши реальные данные MongoDB Atlas
- **JWT_SECRET**: сгенерируйте надежный секретный ключ (минимум 32 символа)
- **NEXT_PUBLIC_API_URL**: замените на ваш реальный домен Vercel

## Генерация JWT_SECRET

Для генерации безопасного JWT_SECRET можно использовать:

```bash
# В терминале
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Или онлайн генератор: https://generate-secret.vercel.app/32

## После настройки

После добавления всех переменных окружения:

1. Перейдите в раздел "Deployments"
2. Нажмите "Redeploy" для последнего деплоя
3. Или сделайте новый коммит в репозиторий для автоматического деплоя

## Проверка

После деплоя проверьте:

1. Логи деплоя на отсутствие ошибок
2. Работу API эндпоинтов
3. Подключение к базе данных в логах функций
