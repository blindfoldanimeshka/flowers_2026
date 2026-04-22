# SEO Оптимизация Floramix

Дата: 22 апреля 2026

## Выполненные улучшения

### 1. Robots.txt ✅
**Файл:** `app/robots.ts`

Создан динамический robots.txt с правилами для поисковых роботов:
- Разрешена индексация всех публичных страниц
- Запрещена индексация админ-панели, API, авторизации
- Добавлена ссылка на sitemap.xml
- **Домен:** https://floramix24.ru

```typescript
rules: [
  {
    userAgent: '*',
    allow: '/',
    disallow: ['/admin/', '/api/', '/auth/', '/_next/', '/uploads/'],
  },
]
```

### 2. Sitemap.xml ✅
**Файл:** `app/sitemap.ts`

Создан динамический sitemap с автоматической генерацией URL:
- Главная страница (приоритет 1.0)
- Все активные категории (приоритет 0.8)
- Все товары в наличии (приоритет 0.7)
- Корзина (приоритет 0.5)
- Добавлены изображения товаров для Google Images
- Указаны даты последнего обновления (lastModified)
- Настроена частота обновления (changeFrequency)

### 3. Метаданные страниц ✅

#### Корневой layout (`app/layout.tsx`)
Расширенные метаданные:
- **Title template:** динамические заголовки для всех страниц
- **Description:** оптимизированное описание магазина
- **Keywords:** релевантные ключевые слова
- **Open Graph:** теги для соцсетей (ВКонтакте, Telegram, WhatsApp)
- **Robots directives:** правила индексации для Google
- **metadataBase:** базовый URL для всех относительных путей

**Примечание:** Twitter/X теги намеренно не добавлены, так как платформа заблокирована в РФ.

#### Главная страница (`app/(root)/page.tsx`)
- Уникальные title и description
- Open Graph метаданные

#### Страницы категорий (`app/category/[slug]/layout.tsx`)
- **generateMetadata:** динамическая генерация метаданных на основе slug
- Уникальные title и description для каждой категории
- Open Graph с динамическими данными
- Автоматическая обработка несуществующих категорий

### 4. Структурированные данные (Schema.org JSON-LD) ✅
**Файл:** `lib/structuredData.ts`

Созданы функции для генерации Schema.org разметки:

#### Organization Schema
```json
{
  "@type": "Organization",
  "name": "Floramix",
  "url": "https://floramix24.ru",
  "logo": "/image/logo.svg",
  "description": "Интернет-магазин цветов с доставкой"
}
```

#### WebSite Schema
```json
{
  "@type": "WebSite",
  "name": "Floramix",
  "potentialAction": {
    "@type": "SearchAction"
  }
}
```

#### Product Schema (готово к использованию)
- Название, описание, цена
- Изображения товара
- Наличие в stock
- Валюта (RUB)

#### BreadcrumbList Schema (готово к использованию)
- Навигационная цепочка для улучшения навигации в поисковой выдаче

Схемы Organization и WebSite уже добавлены в корневой layout.

## Рекомендации для дальнейшего улучшения

### Высокий приоритет

1. **Favicon.ico**
   - Конвертировать существующий `/favicon.svg` в `.ico` формат
   - Добавить в `public/favicon.ico` для лучшей совместимости со старыми браузерами

2. **Переменная окружения**
   - Добавить в `.env`: `NEXT_PUBLIC_SITE_URL=https://floramix24.ru`
   - Это критично для правильной генерации URL в sitemap и метаданных

3. **Alt теги для изображений**
   - Добавить описательные alt атрибуты ко всем изображениям товаров
   - Пример: `alt="Букет роз красных 25 шт"`

4. **H1 заголовки**
   - Убедиться, что на каждой странице есть уникальный H1
   - Главная: "Доставка цветов и букетов в [город]"
   - Категория: название категории
   - Товар: название товара

5. **Canonical URLs**
   - Добавить canonical links для предотвращения дублирования контента
   - Особенно важно если есть параметры фильтрации/сортировки

### Средний приоритет

6. **Product Schema на страницах товаров**
   - Использовать `generateProductSchema()` на страницах товаров
   - Добавить отзывы (aggregateRating) если есть

7. **Breadcrumbs Schema**
   - Использовать `generateBreadcrumbSchema()` на страницах категорий и товаров
   - Пример: Главная → Розы → Букет из 25 роз

8. **Оптимизация производительности**
   - Убрать `force-dynamic` где возможно
   - Использовать ISR (Incremental Static Regeneration) для категорий
   - Добавить `revalidate` для кеширования

9. **Preload критичных ресурсов**
   - Добавить preload для шрифтов
   - Preconnect к Supabase CDN

10. **Structured data для LocalBusiness**
    - Если есть физический магазин, добавить LocalBusiness schema
    - Указать адрес, часы работы, телефон

### Низкий приоритет

11. **Manifest.json для PWA**
    - Создать web app manifest
    - Добавить иконки разных размеров

12. **RSS feed**
    - Создать RSS для новых товаров/категорий

13. **Микроразметка для отзывов**
    - Если планируется система отзывов, добавить Review schema

## Технические детали

### Используемые технологии
- Next.js 16 App Router
- TypeScript
- Metadata API (generateMetadata)
- File-based metadata (robots.ts, sitemap.ts)
- Schema.org JSON-LD

### Соответствие стандартам
- ✅ Open Graph Protocol
- ✅ Schema.org
- ✅ Google Search Console guidelines
- ✅ Yandex Webmaster guidelines
- ✅ Robots Exclusion Protocol

### Проверка результатов

После деплоя рекомендуется проверить:

1. **Google Search Console**
   - Добавить сайт
   - Отправить sitemap.xml
   - Проверить индексацию

2. **Yandex Webmaster**
   - Добавить сайт
   - Отправить sitemap.xml
   - Проверить индексацию

3. **Валидаторы**
   - [Google Rich Results Test](https://search.google.com/test/rich-results)
   - [Schema.org Validator](https://validator.schema.org/)
   - [Open Graph Debugger](https://www.opengraph.xyz/)

4. **Проверка robots.txt**
   - Открыть: `https://floramix24.ru/robots.txt`
   - Проверить в Google Search Console

5. **Проверка sitemap.xml**
   - Открыть: `https://floramix24.ru/sitemap.xml`
   - Убедиться, что все URL корректны

## Ожидаемые результаты

После внедрения этих улучшений:
- ✅ Улучшение индексации в поисковых системах
- ✅ Корректное отображение в социальных сетях
- ✅ Rich snippets в поисковой выдаче
- ✅ Улучшение CTR из поиска
- ✅ Лучшее ранжирование по целевым запросам

## Мониторинг

Рекомендуется отслеживать:
- Позиции в поиске (Google, Yandex)
- Органический трафик
- CTR из поисковой выдачи
- Индексацию страниц
- Ошибки в Search Console

---

**Статус:** Базовая SEO оптимизация завершена ✅
**Следующий шаг:** Добавить переменную окружения NEXT_PUBLIC_SITE_URL и протестировать на production
