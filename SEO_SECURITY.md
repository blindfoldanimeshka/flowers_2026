# SEO Security Implementation

Дата: 22 апреля 2026

## Обнаруженные уязвимости и их исправление

### 1. XSS (Cross-Site Scripting) в JSON-LD ✅

**Проблема:**
Данные из базы (названия товаров, категорий, описания) вставлялись напрямую в JSON-LD без санитизации. Злоумышленник мог создать товар с названием:
```
</script><script>alert('XSS')</script>
```

**Решение:**
Создан модуль `lib/seoSecurity.ts` с функцией `sanitizeForJsonLd()`:
- Экранирует HTML теги (`<`, `>`)
- Экранирует кавычки (`"`, `'`)
- Экранирует слэши (`/`, `\`)
- Удаляет лишние пробелы

**Применено в:**
- `generateProductSchema()` - названия, описания товаров
- `generateBreadcrumbSchema()` - названия в хлебных крошках
- `generateMetadata()` в категориях

### 2. Path Traversal в изображениях ✅

**Проблема:**
URL изображений не валидировались. Злоумышленник мог загрузить товар с изображением:
```
../../etc/passwd
```

**Решение:**
Функция `sanitizeImageUrl()`:
- Удаляет все `../` из пути
- Нормализует слэши
- Проверяет, что путь начинается с `/`
- Возвращает placeholder при пустом значении

**Применено в:**
- `generateProductSchema()` - все изображения товаров
- `sitemap.ts` - фильтрация изображений с `..`

### 3. Price Injection ✅

**Проблема:**
Цена не валидировалась. Можно было передать:
```javascript
price: "999999999999999999999" // переполнение
price: NaN
price: -100 // отрицательная цена
```

**Решение:**
Функция `sanitizePrice()`:
- Проверяет, что значение число
- Проверяет, что цена >= 0
- Округляет до 2 знаков после запятой
- Возвращает 0 при невалидном значении

### 4. URL Injection в slug ✅

**Проблема:**
Slug категории не валидировался. Можно было создать категорию со slug:
```
../../admin
javascript:alert(1)
```

**Решение:**
В `app/category/[slug]/layout.tsx`:
- Валидация regex: `/^[a-z0-9-_]+$/i`
- Разрешены только буквы, цифры, дефисы, подчеркивания
- Возврат 404 при невалидном slug

**Применено в:**
- `generateMetadata()` для категорий
- `sitemap.ts` - используется `encodeURIComponent()`

### 5. DoS через sitemap ✅

**Проблема:**
Sitemap генерировался при каждом запросе, делая запросы к БД. Боты могли перегрузить сервер частыми запросами к `/sitemap.xml`.

**Решение:**
- Добавлен `export const revalidate = 3600` (кеш на 1 час)
- Добавлен try-catch для обработки ошибок БД
- При ошибке возвращаются только статические страницы

### 6. dangerouslySetInnerHTML ⚠️

**Текущее состояние:**
В `app/layout.tsx` используется `dangerouslySetInnerHTML` для вставки JSON-LD:
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
/>
```

**Безопасность:**
✅ Безопасно, так как:
- `JSON.stringify()` автоматически экранирует спецсимволы
- Данные в `organizationSchema` статичные (hardcoded)
- Нет пользовательского ввода

**Риск появится если:**
- Добавить динамические данные без санитизации
- Использовать template strings вместо JSON.stringify

## Созданные файлы

### lib/seoSecurity.ts
Модуль с функциями безопасности:
- `sanitizeForJsonLd()` - экранирование для JSON-LD
- `sanitizeUrl()` - валидация URL
- `sanitizePrice()` - валидация цены
- `sanitizeImageUrl()` - защита от path traversal

## Рекомендации

### Высокий приоритет

1. **Content Security Policy (CSP)**
   ```typescript
   // В next.config.js добавить:
   headers: [
     {
       source: '/:path*',
       headers: [
         {
           key: 'Content-Security-Policy',
           value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
         }
       ]
     }
   ]
   ```

2. **Rate Limiting для sitemap**
   - Использовать middleware для ограничения запросов
   - Например: максимум 10 запросов в минуту с одного IP

3. **Валидация на уровне модели**
   - Добавить валидацию в `models/Product.ts`
   - Проверять формат данных перед сохранением в БД

### Средний приоритет

4. **Логирование подозрительной активности**
   - Логировать попытки XSS
   - Логировать невалидные slug'и
   - Мониторить частоту запросов к sitemap

5. **Sanitize на входе**
   - Валидировать данные в API endpoints
   - Не полагаться только на фронтенд валидацию

6. **Automated Security Testing**
   - Добавить тесты на XSS
   - Тесты на path traversal
   - Тесты на SQL injection (если используется SQL)

### Низкий приоритет

7. **Subresource Integrity (SRI)**
   - Для внешних скриптов (если будут)

8. **HTTPS Enforcement**
   - Редирект с HTTP на HTTPS
   - HSTS заголовки

## Тестирование

### Проверка XSS защиты
```bash
# Попробовать создать товар с названием:
</script><script>alert('XSS')</script>

# Проверить, что в HTML отображается как текст:
&lt;/script&gt;&lt;script&gt;alert('XSS')&lt;/script&gt;
```

### Проверка Path Traversal
```bash
# Попробовать загрузить товар с изображением:
../../etc/passwd

# Проверить, что путь нормализован:
/etc/passwd (или заблокирован)
```

### Проверка Slug Validation
```bash
# Попробовать открыть:
/category/../admin
/category/javascript:alert(1)

# Должно вернуть 404
```

## Соответствие стандартам

- ✅ OWASP Top 10 (XSS, Injection)
- ✅ CWE-79 (Cross-site Scripting)
- ✅ CWE-22 (Path Traversal)
- ✅ CWE-20 (Input Validation)

## Мониторинг

Рекомендуется отслеживать:
- Попытки XSS атак в логах
- Частоту запросов к sitemap.xml
- Ошибки валидации slug
- Подозрительные URL в изображениях

---

**Статус:** Критические уязвимости исправлены ✅
**Следующий шаг:** Добавить CSP заголовки и rate limiting
