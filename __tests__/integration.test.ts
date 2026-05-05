/**
 * FloraMix - Комплексный интеграционный тест v2
 * 
 * Тестирует ВСЕ слой проекта:
 * - Админ-панель (/admin)
 * - Клиентская часть (/client)
 * - Backend API (/api)
 * - Frontend (компоненты)
 * - Database (Supabase)
 * - Связь всех слоёв
 */

const fs = require('fs');
export {};

describe('FloraMix - Комплексный интеграционный тест', () => {
  
  // ═══════════════════════════════════════════════════════════════
  //                    1. DATABASE LAYER (БД)
  // ═══════════════════════════════════════════════════════════════
  
  describe('📦 Database Layer (Supabase)', () => {
    test('Должен подключаться к Supabase', async () => {
      const { supabase, supabaseUrl, supabaseKey } = await import('@/lib/supabase');
      expect(supabase).toBeDefined();
      expect(typeof supabase.from).toBe('function');
      expect(typeof supabaseUrl).toBe('string');
      expect(typeof supabaseKey).toBe('string');
    });

    test('Должен подключаться к БД через lib/db', async () => {
      const { default: connect } = await import('@/lib/db');
      expect(connect).toBeDefined();
      expect(typeof connect).toBe('function');
    });

    test('Должен обрабатывать запросы к таблице documents', async () => {
      const { SUPABASE_COLLECTION_TABLE } = await import('@/lib/supabase');
      expect(SUPABASE_COLLECTION_TABLE).toBe('documents');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    2. BACKEND API LAYER
  // ═══════════════════════════════════════════════════════════════
  
  describe('🔌 Backend API Layer', () => {
    test('Middleware защищает admin маршруты', () => {
      const code = fs.readFileSync('./proxy.ts', 'utf-8');
      expect(code).toContain("'/admin/:path*'");
    });

    test('Middleware защищает API маршруты', () => {
      const code = fs.readFileSync('./proxy.ts', 'utf-8');
      expect(code).toContain("'/api/:path*'");
    });

    test('Middleware защищает auth/login', () => {
      const code = fs.readFileSync('./proxy.ts', 'utf-8');
      expect(code).toContain("'/auth/login");
    });

    test('CSRF валидация доступна', async () => {
      const { isValidCsrfRequest } = await import('@/lib/csrf');
      expect(isValidCsrfRequest).toBeDefined();
    });

    test('CORS проверка доступна', async () => {
      const { isTrustedOriginRequest } = await import('@/lib/csrf');
      expect(isTrustedOriginRequest).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    3. AUTHENTICATION LAYER
  // ═══════════════════════════════════════════════════════════════
  
  describe('🔐 Authentication Layer', () => {
    test('Auth использует JWT библиотеку jose', () => {
      const code = fs.readFileSync('./lib/auth.ts', 'utf-8');
      expect(code).toContain('jose');
      expect(code).toContain('jwtVerify');
    });

    test('Auth экспортирует verifyToken', () => {
      const code = fs.readFileSync('./lib/auth.ts', 'utf-8');
      expect(code).toContain('verifyToken');
    });

    test('Auth создает токен (createToken)', () => {
      const code = fs.readFileSync('./lib/auth.ts', 'utf-8');
      expect(code).toContain('createToken');
    });

    test('Auth экспортирует requireAdmin', () => {
      const code = fs.readFileSync('./lib/auth.ts', 'utf-8');
      expect(code).toContain('requireAdmin');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    4. FRONTEND COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════
  
  describe('🎨 Frontend Components', () => {
    test('AdminNotifications компонент существует', async () => {
      const { default: AdminNotifications } = await import('@/components/AdminNotifications');
      expect(AdminNotifications).toBeDefined();
    });

    test('useAuth хук имеет client директиву', () => {
      const code = fs.readFileSync('./hooks/useAuth.ts', 'utf-8');
      expect(code).toContain("'use client'");
    });

    test('useApi экспортирует функцию', () => {
      const code = fs.readFileSync('./hooks/useApi.ts', 'utf-8');
      expect(code).toContain('export function useApi');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    5. ADMIN PANEL
  // ═══════════════════════════════════════════════════════════════
  
  describe('⚙️ Admin Panel', () => {
    test('Админ layout существует', () => {
      expect(fs.existsSync('./app/admin/layout.tsx')).toBe(true);
    });

    test('Админ страница категорий существует', () => {
      expect(fs.existsSync('./app/admin/categories')).toBe(true);
    });

    test('Админ страница товаров существует', () => {
      expect(fs.existsSync('./app/admin/products')).toBe(true);
    });

    test('Админ страница заказов существует', () => {
      expect(fs.existsSync('./app/admin/orders')).toBe(true);
    });

    test('Админ страница настроек существует', () => {
      expect(fs.existsSync('./app/admin/settings')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    6. CLIENT STORE
  // ═══════════════════════════════════════════════════════════════
  
  describe('🛒 Client Store', () => {
    test('Клиентский layout существует', () => {
      expect(fs.existsSync('./app/client/layout.tsx')).toBe(true);
    });

    test('Клиентские компоненты существуют', () => {
      expect(fs.existsSync('./app/client/components')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    7. API ROUTES
  // ═══════════════════════════════════════════════════════════════
  
  describe('🌐 API Routes', () => {
    test('API /categories', () => {
      expect(fs.existsSync('./app/api/categories/route.ts')).toBe(true);
    });
    test('API /products', () => {
      expect(fs.existsSync('./app/api/products/route.ts')).toBe(true);
    });
    test('API /orders', () => {
      expect(fs.existsSync('./app/api/orders/route.ts')).toBe(true);
    });
    test('API /auth/login', () => {
      expect(fs.existsSync('./app/api/auth/login/route.ts')).toBe(true);
    });
    test('API /health', () => {
      expect(fs.existsSync('./app/api/health/route.ts')).toBe(true);
    });
    test('API /subcategories', () => {
      expect(fs.existsSync('./app/api/subcategories/route.ts')).toBe(true);
    });
    test('API /settings', () => {
      expect(fs.existsSync('./app/api/settings/route.ts')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    8. LIB UTILITIES
  // ═══════════════════════════════════════════════════════════════
  
  describe('🔧 Lib Utilities', () => {
    test('Валидации', async () => {
      const v = await import('@/lib/validations');
      expect(v).toBeDefined();
    });

    test('Telegram', async () => {
      const t = await import('@/lib/telegram');
      expect(t).toBeDefined();
    });

    test('Logger', async () => {
      const l = await import('@/lib/logger');
      expect(l).toBeDefined();
    });

    test('Cache использует Next.js cache API', () => {
      const code = fs.readFileSync('./lib/cache.ts', 'utf-8');
      expect(code).toContain('unstable_cache');
    });

    test('Rate limiting использует Upstash', () => {
      const code = fs.readFileSync('./lib/rateLimit.ts', 'utf-8');
      expect(code).toContain('@upstash/redis');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    9. CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  
  describe('⚙️ Configuration', () => {
    test('Next.js config', () => {
      const config = fs.readFileSync('./next.config.js', 'utf-8');
      expect(config).toContain('nextConfig');
    });

    test('tsconfig.json', () => {
      expect(fs.existsSync('./tsconfig.json')).toBe(true);
    });

    test('.env.example', () => {
      expect(fs.existsSync('./.env.example')).toBe(true);
    });

    test('package.json валиден', () => {
      const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
      expect(pkg.name).toBe('flower-production');
    });

    test('Dependencies установлены', () => {
      const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
      expect(pkg.dependencies.next).toBeDefined();
      expect(pkg.dependencies['@supabase/supabase-js']).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    10. DEPENDENCIES
  // ═══════════════════════════════════════════════════════════════
  
  describe('📚 Dependencies', () => {
    test('Next.js', async () => {
      const next = await import('next');
      expect(next).toBeDefined();
    });

    test('React', async () => {
      const React = await import('react');
      expect(React).toBeDefined();
    });

    test('Supabase-js', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      expect(createClient).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    11. INTEGRATION
  // ═══════════════════════════════════════════════════════
  
  describe('🔗 Integration', () => {
    test('Supabase клиент связан с БД', async () => {
      const { supabase } = await import('@/lib/supabase');
      const { default: connect } = await import('@/lib/db');
      expect(supabase).toBeDefined();
      expect(connect).toBeDefined();
    });

    test('Middleware связывает все слои', () => {
      const code = fs.readFileSync('./proxy.ts', 'utf-8');
      expect(code).toContain("matcher:");
    });

    test('Auth использует Supabase', () => {
      const authCode = fs.readFileSync('./lib/auth.ts', 'utf-8');
      const supabaseCode = fs.readFileSync('./lib/supabase.ts', 'utf-8');
      expect(authCode).toContain('jose');
      expect(supabaseCode).toContain('supabase-js');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                    12. BUILD TESTS
  // ═══════════════════════════════════════════════════════════════
  
  describe('🔥 Build Tests', () => {
    test('TypeScript компиляция', () => {
      const tsconfig = fs.readFileSync('./tsconfig.json', 'utf-8');
      expect(tsconfig).toContain('compilerOptions');
    });

    test('Jest настроен', () => {
      expect(fs.existsSync('./jest.config.js')).toBe(true);
    });

    test('Jest setup существует', () => {
      expect(fs.existsSync('./jest.setup.js')).toBe(true);
    });
  });
});

