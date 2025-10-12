# Floramix - Онлайн-магазин цветов

Проект онлайн-магазина цветов с использованием Next.js и MongoDB.

## Технологии

- Next.js
- React
- TypeScript
- Tailwind CSS
- MongoDB
- Docker

## Запуск проекта с MongoDB

### Предварительные требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) должен быть установлен и запущен
- [Node.js](https://nodejs.org/) (версия 18 или выше)
- [npm](https://www.npmjs.com/) или [yarn](https://yarnpkg.com/)

### Шаги для запуска

1. Клонируйте репозиторий:
   ```bash
   git clone <URL_репозитория>
   cd flower
   ```

2. Создайте файл `.env` на основе `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Убедитесь, что Docker Desktop запущен. После запуска Docker Desktop выполните:
   ```bash
   docker compose up -d
   ```
   
   Это запустит:
   - MongoDB на порту 27017
   - Mongo Admin (mongo-express) на порту 8081 для управления базой данных через веб-интерфейс

4. Установите зависимости:
   ```bash
   npm install
   # или
   yarn
   ```

5. Запустите приложение:
   ```bash
   npm run dev
   # или
   yarn dev
   ```

6. Откройте [http://localhost:3000](http://localhost:3000) в браузере.

7. Для доступа к веб-интерфейсу MongoDB (Mongo Admin) откройте [http://localhost:8081](http://localhost:8081):
   - Логин: admin
   - Пароль: admin123

## Доступы и учетные данные

- **MongoDB URL**: `mongodb://floweradmin:flowerpassword@localhost:27017/flowerdb?authSource=admin`
- **Администратор БД**: `floweradmin`
- **Пароль БД**: `flowerpassword`
- **Mongo Admin логин**: `admin`
- **Mongo Admin пароль**: `admin123`

- Вход в админ-панель приложения:
  - Логин: `AdminFlows`
  - Пароль: `KMFlAdmin`

## Структура проекта

- `/app` - Основные компоненты и страницы приложения
- `/app/models` - Mongoose модели для MongoDB
- `/app/lib` - Вспомогательные функции, включая подключение к базе данных
- `/public` - Статические файлы
- `docker-compose.yml` - Настройки Docker для MongoDB и Mongo Admin

## Устранение неполадок

- Если Docker не подключается, убедитесь, что Docker Desktop запущен
- В Windows может потребоваться запуск Docker Desktop от имени администратора
- Если порт 8081 уже занят, измените порт в docker-compose.yml для сервиса mongo-admin
