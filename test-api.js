/**
 * Комплексный скрипт для тестирования API онлайн-магазина Floramix.
 * 
 * Использование:
 * 1. Убедитесь, что сервер запущен (`npm run dev`).
 * 2. Запустите скрипт из терминала: `node test-api.js`
 * 
 * Скрипт последовательно выполняет все тесты:
 * - Авторизация и получение токена.
 * - Проверка публичных эндпоинтов.
 * - Полный CRUD-цикл для категорий, подкатегорий и товаров.
 * - Создание и обновление заказа.
 * - Обновление настроек.
 * - Полная очистка созданных тестовых данных.
 * - Выход из системы.
 */

const BASE_URL = 'http://localhost:3000/api';

// --- Утилиты ---
const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

const log = (message, color = COLORS.reset) => console.log(color, message, COLORS.reset);

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({})); // Handle empty responses
    const success = response.ok;
    
    return { success, data, status: response.status };
  } catch (error) {
    return { success: false, data: { error: error.message }, status: 0 };
  }
}

// --- Тестовые функции ---

async function testAuth() {
  log('\n🔐 Тестирование аутентификации...');
  const res = await makeRequest(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username: 'AdminFlows', password: 'KMFlAdmin' }),
  });

  const token = res.data?.token;
  if (token) {
    log(`   Вход администратора: ✅`, COLORS.green);
  } else {
    log(`   Вход администратора: ❌`, COLORS.red);
    log(`   Статус ответа: ${res.status}`, COLORS.yellow);
    log(`   Тело ответа: ${JSON.stringify(res.data)}`, COLORS.yellow);
  }
  return token;
}

async function testPublicEndpoints() {
    log('\n🌍 Тестирование публичных эндпоинтов...');
    const endpoints = ['/products', '/categories', '/settings'];
    for (const endpoint of endpoints) {
        const res = await makeRequest(`${BASE_URL}${endpoint}`);
        if (res.success) {
            log(`   GET ${endpoint}: ✅`, COLORS.green);
        } else {
            log(`   GET ${endpoint}: ❌`, COLORS.red);
            log(`     Response: ${res.status} ${JSON.stringify(res.data)}`, COLORS.yellow);
        }
    }
}

async function testCategories(token) {
  log('\n🗂️  Тестирование категорий...');
  const headers = { 'Authorization': `Bearer ${token}` };
  const categoryName = `Тестовая категория ${Date.now()}`;

  // POST
  const postRes = await makeRequest(`${BASE_URL}/categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: categoryName }),
  });
  if (postRes.success) {
      log(`   POST /categories: ✅`, COLORS.green);
  } else {
      log(`   POST /categories: ❌`, COLORS.red);
      log(`     Response: ${postRes.status} ${JSON.stringify(postRes.data)}`, COLORS.yellow);
  }
  const categoryId = postRes.data?._id;

  if (!categoryId) return null;

  // GET
  const getRes = await makeRequest(`${BASE_URL}/categories/${categoryId}`, { headers });
  if (getRes.success) {
    log(`   GET /categories/[id]: ✅`, COLORS.green);
  } else {
    log(`   GET /categories/[id]: ❌`, COLORS.red);
    log(`     Response: ${getRes.status} ${JSON.stringify(getRes.data)}`, COLORS.yellow);
  }

  // PUT
  const putRes = await makeRequest(`${BASE_URL}/categories/${categoryId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name: `${categoryName} (обновлено)` }),
  });
  if (putRes.success) {
    log(`   PUT /categories/[id]: ✅`, COLORS.green);
  } else {
    log(`   PUT /categories/[id]: ❌`, COLORS.red);
    log(`     Response: ${putRes.status} ${JSON.stringify(putRes.data)}`, COLORS.yellow);
  }
  
  return categoryId;
}

async function testSubcategories(token, categoryId) {
    if (!categoryId) {
        log('   Тестирование подкатегорий пропущено: не удалось создать категорию.', COLORS.yellow);
        return null;
    }
    log('\n📑 Тестирование подкатегорий...');
    const headers = { 'Authorization': `Bearer ${token}` };
    const subcategoryName = `Тестовая подкатегория ${Date.now()}`;

    // POST
    const postRes = await makeRequest(`${BASE_URL}/subcategories`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: subcategoryName, categoryId }),
    });
    if (postRes.success) {
        log(`   POST /subcategories: ✅`, COLORS.green);
    } else {
        log(`   POST /subcategories: ❌`, COLORS.red);
        log(`     Response: ${postRes.status} ${JSON.stringify(postRes.data)}`, COLORS.yellow);
    }
    const subcategoryId = postRes.data?._id;

    if (!subcategoryId) return null;

    // GET
    const getRes = await makeRequest(`${BASE_URL}/subcategories/${subcategoryId}`, { headers });
     if (getRes.success) {
        log(`   GET /subcategories/[id]: ✅`, COLORS.green);
    } else {
        log(`   GET /subcategories/[id]: ❌`, COLORS.red);
        log(`     Response: ${getRes.status} ${JSON.stringify(getRes.data)}`, COLORS.yellow);
    }


    // PUT
    const putRes = await makeRequest(`${BASE_URL}/subcategories/${subcategoryId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: `${subcategoryName} (обновлено)` }),
    });
    if (putRes.success) {
        log(`   PUT /subcategories/[id]: ✅`, COLORS.green);
    } else {
        log(`   PUT /subcategories/[id]: ❌`, COLORS.red);
        log(`     Response: ${putRes.status} ${JSON.stringify(putRes.data)}`, COLORS.yellow);
    }

    return subcategoryId;
}


async function testProducts(token, categoryId, subcategoryId) {
    if (!categoryId) { // subcategoryId может быть null
        log('   Тестирование продуктов пропущено: не удалось создать категорию.', COLORS.yellow);
        return null;
    }
    log('\n🌷 Тестирование продуктов...');
    const headers = { 'Authorization': `Bearer ${token}` };
    const productName = `Тестовый продукт ${Date.now()}`;

    // POST
    const productData = {
        name: productName,
        price: 100,
        description: 'Тестовое описание',
        categoryId,
        inStock: true,
        image: '/uploads/placeholder.jpg' // Добавлено обязательное поле
    };
    if (subcategoryId) {
        productData.subcategoryId = subcategoryId;
    }

    const postRes = await makeRequest(`${BASE_URL}/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(productData),
    });
    if (postRes.success) {
        log(`   POST /products: ✅`, COLORS.green);
    } else {
        log(`   POST /products: ❌`, COLORS.red);
        log(`     Response: ${postRes.status} ${JSON.stringify(postRes.data)}`, COLORS.yellow);
    }
    const productId = postRes.data?._id;

    if (!productId) return null;

    // GET by ID
    const getRes = await makeRequest(`${BASE_URL}/products/${productId}`, { headers });
    if (getRes.success) {
        log(`   GET /products/[id]: ✅`, COLORS.green);
    } else {
        log(`   GET /products/[id]: ❌`, COLORS.red);
        log(`     Response: ${getRes.status} ${JSON.stringify(getRes.data)}`, COLORS.yellow);
    }

    // PUT
    const putRes = await makeRequest(`${BASE_URL}/products/${productId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ price: 200 }),
    });
     if (putRes.success) {
        log(`   PUT /products/[id]: ✅`, COLORS.green);
    } else {
        log(`   PUT /products/[id]: ❌`, COLORS.red);
        log(`     Response: ${putRes.status} ${JSON.stringify(putRes.data)}`, COLORS.yellow);
    }

    return productId;
}

async function testOrders(token, productId) {
    if (!productId) {
        log('   Тестирование заказов пропущено: не удалось создать продукт.', COLORS.yellow);
        return;
    }
    log('\n🛒 Тестирование заказов...');
    const headers = { 'Authorization': `Bearer ${token}` };

    // POST (public)
    const postRes = await makeRequest(`${BASE_URL}/orders`, {
        method: 'POST',
        body: JSON.stringify({
            customer: { 
                name: 'Тестовый Покупатель', 
                phone: '+79998887766',
                email: 'test@test.com',
                address: 'Тестовый адрес'
            },
            items: [{ productId, quantity: 1, price: 200, name: 'Тестовый продукт', image: '/placeholder.jpg' }],
            totalAmount: 200,
            paymentMethod: 'cash'
        }),
    });
    if (postRes.success) {
        log(`   POST /orders: ✅`, COLORS.green);
    } else {
        log(`   POST /orders: ❌`, COLORS.red);
        log(`     Response: ${postRes.status} ${JSON.stringify(postRes.data)}`, COLORS.yellow);
    }
    const orderId = postRes.data?._id;
    
    if (!orderId) return;

    // GET All (private)
    const getRes = await makeRequest(`${BASE_URL}/orders`, { headers });
    if (getRes.success) {
        log(`   GET /orders (all): ✅`, COLORS.green);
    } else {
        log(`   GET /orders (all): ❌`, COLORS.red);
        log(`     Response: ${getRes.status} ${JSON.stringify(getRes.data)}`, COLORS.yellow);
    }
    
    // PUT (private)
    const putRes = await makeRequest(`${BASE_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: 'completed' }),
    });
    if (putRes.success) {
        log(`   PUT /orders?id=...: ✅`, COLORS.green);
    } else {
        log(`   PUT /orders?id=...: ❌`, COLORS.red);
        log(`     Response: ${putRes.status} ${JSON.stringify(putRes.data)}`, COLORS.yellow);
    }
}

async function testSettings(token) {
    log('\n⚙️  Тестирование настроек...');
    const headers = { 'Authorization': `Bearer ${token}` };
    const settingsData = {
        siteName: 'Новое имя сайта',
        contactPhone: '+71112223344',
        address: 'Новый тестовый адрес',
        workingHours: '24/7'
    };
    const putRes = await makeRequest(`${BASE_URL}/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(settingsData),
    });
    if (putRes.success) {
        log(`   PUT /settings: ✅`, COLORS.green);
    } else {
        log(`   PUT /settings: ❌`, COLORS.red);
        log(`     Response: ${putRes.status} ${JSON.stringify(putRes.data)}`, COLORS.yellow);
    }
}


async function testCleanup(token, ids) {
    log('\n🧹 Очистка тестовых данных...');
    const headers = { 'Authorization': `Bearer ${token}` };

    const deleteIfExists = async (type, id) => {
        if (id) {
            const res = await makeRequest(`${BASE_URL}/${type}/${id}`, { method: 'DELETE', headers });
            if (res.success) {
                log(`   DELETE /${type}/[id]: ✅`, COLORS.green);
            } else {
                log(`   DELETE /${type}/[id]: ❌`, COLORS.red);
                log(`     Response: ${res.status} ${JSON.stringify(res.data)}`, COLORS.yellow);
            }
        }
    };
    
    await deleteIfExists('products', ids.productId);
    await deleteIfExists('subcategories', ids.subcategoryId);
    await deleteIfExists('categories', ids.categoryId);
}

async function testLogout(token) {
    log('\n🚪 Тестирование выхода...');
    const res = await makeRequest(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    log(`   POST /auth/logout: ${res.success ? '✅' : '❌'}`, res.success ? COLORS.green : COLORS.red);
}

// --- Основной скрипт ---
async function runTests() {
  log('🚀 Запуск полного тестирования API...', COLORS.magenta);
  
  const token = await testAuth();
  if (!token) {
    log('\nАвторизация провалена. Дальнейшие тесты невозможны.', COLORS.red);
    return;
  }
  
  await testPublicEndpoints();

  const categoryId = await testCategories(token);
  const subcategoryId = await testSubcategories(token, categoryId);
  const productId = await testProducts(token, categoryId, subcategoryId);

  await testOrders(token, productId);
  await testSettings(token);
  
  await testCleanup(token, { productId, subcategoryId, categoryId });

  await testLogout(token);

  log('\n🏁 Тестирование завершено.', COLORS.magenta);
}

runTests(); 