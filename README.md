# FloraMix / Flower Shop

Интернет-магазин цветов на Next.js: витрина для покупателей и админ-панель для заказов, каталога и настроек магазина.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)

## Возможности

- **Клиентская часть** (`app/client`, `features/app`): главная, каталог по категориям и подкатегориям, карточки товаров, корзина, оформление заказа.
- **Админ-панель** (`app/admin`, `features/admin`): заказы (фоновое обновление, уведомления о новых заказах, подсветка новых строк), товары, категории, настройки магазина, загрузка изображений.
- **API** (`app/api`): товары, категории, подкатегории, заказы, авторизация администратора (JWT), настройки, загрузки, health-check.

## Стек

| Область | Технологии |
|--------|------------|
| Frontend | Next.js (App Router), React 19, TypeScript |
| Стили | Tailwind CSS 4, Framer Motion |
| Данные | Supabase (PostgreSQL), универсальная таблица документов (`documents`) |
| Auth | JWT (`jose` / `jsonwebtoken`), bcrypt |
| Формы / UI | react-toastify, react-imask, Lucide / react-icons |
| Качество | ESLint (eslint-config-next), Jest |

## Требования

- Node.js **>= 18**
- npm **>= 8**
- Проект Supabase и выполненный SQL-инициализатор (см. ниже)

## Быстрый старт

```bash
git clone <url-репозитория>
cd flower_shop

npm install

cp .env.example .env
# Заполните переменные (минимум Supabase + JWT_SECRET + NEXT_PUBLIC_API_URL для локали)

npm run generate-secrets   # скопируйте вывод JWT_SECRET в .env.local при необходимости

npm run dev
```

Сайт по умолчанию: [http://localhost:3000](http://localhost:3000) (в `package.json` dev-сервер слушает `0.0.0.0`).

### Supabase: схема БД

1. Создайте проект в [Supabase](https://supabase.com/).
2. В **SQL Editor** выполните скрипт [`scripts/supabase-init.sql`](scripts/supabase-init.sql) — создаётся таблица `documents` (jsonb-документы по полю `collection`).
3. В **Project Settings → API** скопируйте URL и ключи в `.env.local`.

### Переменные окружения

Ориентир — файл [`.env.example`](.env.example):

| Переменная | Назначение |
|------------|------------|
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | URL проекта Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` или `SUPABASE_ANON_KEY` | Ключ API (для серверных операций предпочтителен service role) |
| `SUPABASE_COLLECTION_TABLE` | Имя таблицы (по умолчанию `documents`) |
| `JWT_SECRET` | Секрет подписи JWT админ-сессии |
| `NEXT_PUBLIC_API_URL` | Базовый URL приложения (локально: `http://localhost:3000`) |
| `ALLOWED_ORIGINS` | CORS (через запятую) |

Опционально: лимиты запросов, логи, настройки платежей — см. комментарии в `env.example`.

### Первый администратор

```bash
npm run db:create-admin
```

Логин и пароль задаются в интерактивном режиме скрипта (или по документации `create-admin.js`). Вход в админку выполняется через форму авторизации администратора.

### Тестовые данные

```bash
npm run db:seed
```

## Скрипты npm

| Команда | Описание |
|--------|----------|
| `npm run dev` | Режим разработки Next.js (`-H 0.0.0.0`) |
| `npm run build` | Продакшен-сборка |
| `npm run start` | Запуск после `build` |
| `npm run preview` | `build` + `start` |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run type-check` | `tsc --noEmit` |
| `npm run test` | Jest |
| `npm run test:db` | Проверка подключения к приложению/БД (`test-app.js`) |
| `npm run db:seed` | Заполнение БД |
| `npm run db:create-admin` | Создание админа |
| `npm run generate-secrets` | Случайные секреты в консоль |
| `npm run health-check` | Проверка здоровья (`scripts/health-check.js`) |
| `npm run setup` | Скрипт начальной настройки |
| `npm run clean` | Очистка `.next` и кэша |

## Структура репозитория

```
├── app/
│   ├── (root)/           # Публичная главная
│   ├── admin/            # Админ-панель (layouts, страницы)
│   ├── api/              # Route Handlers REST API
│   ├── client/           # Клиентский UI (layout, компоненты, корзина)
│   ├── actions/          # Server Actions
│   └── context/          # React Context (например корзина)
├── features/             # Фичи: admin/*, app/* (каталог, корзина)
├── components/           # Общие компоненты (UI, админ-уведомления)
├── hooks/                # Хуки (auth, уведомления о заказах)
├── lib/                  # db, supabase, api, csrf, rateLimit, валидации
├── models/               # Модели домена и работа с коллекциями в Supabase
├── scripts/              # supabase-init.sql, health-check, setup, deploy
├── public/               # Статика
└── __tests__/            # Юнит-тесты
```

## API (кратко)

- `GET /api/health` — проверка работоспособности  
- Товары: `/api/products`, `/api/products/[id]`, фильтры, по категории/подкатегории  
- Категории и подкатегории: `/api/categories`, `/api/subcategories`  
- Заказы: `/api/orders`, `/api/orders/latest` (для админ-опроса новых заказов)  
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`  
- Настройки и загрузки: `/api/settings`, `/api/upload`, `/api/uploads/...`

## Деплой (например Vercel)

1. Подключите репозиторий в Vercel, framework preset: **Next.js**.
2. Перенесите переменные из `.env.local` в **Environment Variables** проекта (включая Supabase и `JWT_SECRET`).
3. Укажите `NEXT_PUBLIC_API_URL` и `ALLOWED_ORIGINS` на продакшен-домен.
4. После деплоя создайте администратора: `npm run db:create-admin` (с доступом к той же БД Supabase) или отдельный защищённый процесс.

## Устранение неполадок

- **Ошибка подключения Supabase** — проверьте `SUPABASE_URL`, ключ и что таблица из `supabase-init.sql` создана; сообщение в логе может указывать на неверную схему `documents`.
- **401/403 в админке** — сессия JWT, cookie, `JWT_SECRET` одинаковый везде после смены.
- **Сборка падает** — `npm run lint` и `npm run type-check`; исправьте ошибки, не отключая проверки без необходимости.
- **Картинки** — проверьте `next.config` и маршрут `/api/upload` / хранение в настройках проекта.

## Статус Отладки (2026-05-04)

- Исправлены падения `next build` из-за ранней инициализации Supabase в API/кэше.
- Синхронизированы версии ESLint (`eslint@9` + flat config).
- `npm run type-check` проходит.
- `npm test -- --runInBand` проходит (63/63).
- `npm run build` проходит.
- В `npm run lint` остаётся legacy-техдолг (много `any` и `require` в старых модулях), это отдельный поэтапный рефакторинг.

### Проверки Перед Деплоем

```bash
npm run type-check
npm test -- --runInBand
npm run build
```

Для Windows PowerShell при запрете `npm.ps1`:

```bash
npm.cmd run type-check
npm.cmd test -- --runInBand
npm.cmd run build
```

## Разработчики

blindfoldStudios:
blindfold
Z3r00000-cyber
virpom
TcKatFire
