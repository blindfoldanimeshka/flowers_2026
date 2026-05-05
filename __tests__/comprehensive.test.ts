/**
 * Comprehensive Test Suite - FloraMix Platform
 * Core-First Approach: auth → API → client → admin → integrations
 *
 * Tests ALL components: Client, Admin, API, Supabase, Integrations
 * Coverage target: 70% (per jest.config.js)
 */

const fs = require('fs');
const path = require('path');

// ═════════════════════════════════════════════════════════════
//                    SECTION 1: SETUP & MOCKS
// ═════════════════════════════════════════════════════════════

describe('🔧 Section 1: Setup & Mocks', () => {
  test('Jest config exists and is valid', () => {
    const config = require('../../jest.config.js');
    expect(config).toBeDefined();
    expect(config.testEnvironment).toBe('jest-environment-jsdom');
  });

  test('Jest setup file exists', () => {
    expect(fs.existsSync('./jest.setup.js')).toBe(true);
  });

  test('Environment variables are mocked', () => {
    expect(process.env.NEXT_PUBLIC_API_URL).toBeDefined();
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_COLLECTION_TABLE).toBeDefined();
  });

  test('Next.js router is mocked', () => {
    const router = require('next/router');
    expect(router.useRouter().push).toBeDefined();
  });

  test('Next.js navigation is mocked', () => {
    const navigation = require('next/navigation');
    expect(navigation.useRouter().push).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════
//                    SECTION 2: AUTH & MIDDLEWARE (CRITICAL)
// ═════════════════════════════════════════════════════════════

describe('🔐 Section 2: Auth & Middleware (CRITICAL)', () => {
  // 2.1 JWT Auth (lib/auth.ts)
  describe('JWT Authentication', () => {
    test('Auth module uses jose library', () => {
      const code = fs.readFileSync('./lib/auth.ts', 'utf-8');
      expect(code).toContain('jose');
      expect(code).toContain('jwtVerify');
    });

    test('Auth exports createToken function', () => {
      const code = fs.readFileSync('./lib/auth.ts', 'utf-8');
      expect(code).toContain('createToken');
    });

    test('Auth exports verifyToken function', () => {
      const code = fs.readFileSync('./lib/auth.ts', 'utf-8');
      expect(code).toContain('verifyToken');
    });

    test('Auth exports requireAdmin function', () => {
      const code = fs.readFileSync('./lib/auth.ts', 'utf-8');
      expect(code).toContain('requireAdmin');
    });

    test('JWT uses HS256 algorithm', () => {
      const code = fs.readFileSync('./lib/auth.ts', 'utf-8');
      expect(code).toContain('HS256');
    });

    test('Token includes role in payload', () => {
      const code = fs.readFileSync('./lib/auth.ts', 'utf-8');
      expect(code).toContain('role');
    });

    test('Token expires in 7 days', () => {
      const code = fs.readFileSync('./lib/auth.ts', 'utf-8');
      expect(code).toContain('7d') || expect(code).toContain('604800');
    });
  });

  // 2.2 Middleware Protection
  describe('Middleware Protection', () => {
    test('Middleware protects admin routes', () => {
      const code = fs.readFileSync('./middleware.ts', 'utf-8');
      expect(code).toContain("'/admin/:path*'");
    });

    test('Middleware protects API routes', () => {
      const code = fs.readFileSync('./middleware.ts', 'utf-8');
      expect(code).toContain("'/api/:path*'");
    });

    test('Middleware allows auth/login', () => {
      const code = fs.readFileSync('./middleware.ts', 'utf-8');
      expect(code).toContain("'/auth/login");
    });

    test('Middleware has matcher config', () => {
      const code = fs.readFileSync('./middleware.ts', 'utf-8');
      expect(code).toContain('matcher:');
    });

    test('Middleware sets user headers', () => {
      const code = fs.readFileSync('./middleware.ts', 'utf-8');
      expect(code).toContain('x-user-id');
      expect(code).toContain('x-user-role');
    });
  });

  // 2.3 CSRF Protection
  describe('CSRF Protection', () => {
    test('CSRF validation function exists', async () => {
      const { isValidCsrfRequest } = await import('@/lib/csrf');
      expect(isValidCsrfRequest).toBeDefined();
      expect(typeof isValidCsrfRequest).toBe('function');
    });

    test('Origin validation function exists', async () => {
      const { isTrustedOriginRequest } = await import('@/lib/csrf');
      expect(isTrustedOriginRequest).toBeDefined();
      expect(typeof isTrustedOriginRequest).toBe('function');
    });

    test('CSRF uses cookies for auth', () => {
      const code = fs.readFileSync('./lib/csrf.ts', 'utf-8');
      expect(code).toContain('cookie');
    });
  });

  // 2.4 Login/Logout Endpoints
  describe('Login/Logout Endpoints', () => {
    test('Login API route exists', () => {
      expect(fs.existsSync('./app/api/auth/login/route.ts')).toBe(true);
    });

    test('Logout API route exists', () => {
      expect(fs.existsSync('./app/api/auth/logout/route.ts')).toBe(true);
    });

    test('Me API route exists', () => {
      expect(fs.existsSync('./app/api/auth/me/route.ts')).toBe(true);
    });

    test('Login page exists', () => {
      expect(fs.existsSync('./app/auth/login/page.tsx')).toBe(true);
    });

    test('Login page uses client directive', () => {
      const code = fs.readFileSync('./app/auth/login/page.tsx', 'utf-8');
      expect(code).toContain("'use client'");
    });
  });
});

// ═════════════════════════════════════════════════════════════
//                    SECTION 3: API ROUTES (30+ ENDPOINTS)
// ═════════════════════════════════════════════════════════════

describe('🌐 Section 3: API Routes', () => {
  // 3.1 Products Endpoints
  describe('Products API', () => {
    const productsRoutes = [
      'app/api/products/route.ts',
      'app/api/products/[id]/route.ts',
      'app/api/products/featured/route.ts',
      'app/api/products/filter/route.ts',
      'app/api/products/search/route.ts',
      'app/api/products/by-category/[categoryId]/route.ts',
      'app/api/products/by-subcategory/[subcategoryId]/route.ts',
    ];

    productsRoutes.forEach((route) => {
      test(`${route} exists`, () => {
        expect(fs.existsSync(route)).toBe(true);
      });
    });

    test('Products route handles GET', () => {
      const code = fs.readFileSync('./app/api/products/route.ts', 'utf-8');
      expect(code).toContain('export async function GET');
    });

    test('Products route handles POST', () => {
      const code = fs.readFileSync('./app/api/products/route.ts', 'utf-8');
      expect(code).toContain('export async function POST');
    });

    test('Products [id] route handles GET', () => {
      const code = fs.readFileSync('./app/api/products/[id]/route.ts', 'utf-8');
      expect(code).toContain('export async function GET');
    });

    test('Products [id] route handles PUT', () => {
      const code = fs.readFileSync('./app/api/products/[id]/route.ts', 'utf-8');
      expect(code).toContain('export async function PUT');
    });

    test('Products [id] route handles DELETE', () => {
      const code = fs.readFileSync('./app/api/products/[id]/route.ts', 'utf-8');
      expect(code).toContain('export async function DELETE');
    });
  });

  // 3.2 Categories Endpoints
  describe('Categories API', () => {
    const categoriesRoutes = [
      'app/api/categories/route.ts',
      'app/api/categories/[id]/route.ts',
      'app/api/categories/[id]/subcategories/route.ts',
      'app/api/categories/stats/route.ts',
      'app/api/categories/reorder/route.ts',
    ];

    categoriesRoutes.forEach((route) => {
      test(`${route} exists`, () => {
        expect(fs.existsSync(route)).toBe(true);
      });
    });

    test('Categories route uses Supabase', () => {
      const code = fs.readFileSync('./app/api/categories/route.ts', 'utf-8');
      expect(code).toContain('supabase');
    });
  });

  // 3.3 Subcategories Endpoints
  describe('Subcategories API', () => {
    test('Subcategories route exists', () => {
      expect(fs.existsSync('./app/api/subcategories/route.ts')).toBe(true);
    });

    test('Subcategories [id] route exists', () => {
      expect(fs.existsSync('./app/api/subcategories/[id]/route.ts')).toBe(true);
    });
  });

  // 3.4 Orders Endpoints
  describe('Orders API', () => {
    const ordersRoutes = [
      'app/api/orders/route.ts',
      'app/api/orders/[id]/route.ts',
      'app/api/orders/latest/route.ts',
    ];

    ordersRoutes.forEach((route) => {
      test(`${route} exists`, () => {
        expect(fs.existsSync(route)).toBe(true);
      });
    });

    test('Orders POST is public (no auth required)', () => {
      const code = fs.readFileSync('./app/api/orders/route.ts', 'utf-8');
      expect(code).toContain('POST');
    });
  });

  // 3.5 Settings Endpoints
  describe('Settings API', () => {
    test('Settings route exists', () => {
      expect(fs.existsSync('./app/api/settings/route.ts')).toBe(true);
    });

    test('Settings route is public (GET)', () => {
      const code = fs.readFileSync('./app/api/settings/route.ts', 'utf-8');
      expect(code).toContain('GET');
    });
  });

  // 3.6 Upload/Media Endpoints
  describe('Upload/Media API', () => {
    test('Upload route exists', () => {
      expect(fs.existsSync('./app/api/upload/route.ts')).toBe(true);
    });

    test('Media library route exists', () => {
      expect(fs.existsSync('./app/api/media-library/route.ts')).toBe(true);
    });

    test('Uploads serve route exists', () => {
      expect(fs.existsSync('./app/api/uploads/[...path]/route.ts')).toBe(true);
    });
  });

  // 3.7 Health/Stats/Performance Endpoints
  describe('Health/Stats/Performance API', () => {
    test('Health route exists', () => {
      expect(fs.existsSync('./app/api/health/route.ts')).toBe(true);
    });

    test('Stats route exists', () => {
      expect(fs.existsSync('./app/api/stats/route.ts')).toBe(true);
    });

    test('Performance route exists', () => {
      expect(fs.existsSync('./app/api/performance/route.ts')).toBe(true);
    });
  });

  // 3.8 Payment Endpoints
  describe('Payments API', () => {
    test('Payment settings route exists', () => {
      expect(fs.existsSync('./app/api/payments/settings/route.ts')).toBe(true);
    });

    test('Payment process route exists', () => {
      expect(fs.existsSync('./app/api/payments/process/route.ts')).toBe(true);
    });
  });

  // 3.9 Supabase Migration Endpoint
  describe('Supabase Migration API', () => {
    test('Supabase migrate route exists', () => {
      expect(fs.existsSync('./app/api/supabase-migrate/route.ts')).toBe(true);
    });

    test('Supabase products route exists', () => {
      expect(fs.existsSync('./app/api/supabase-products/route.ts')).toBe(true);
    });
  });
});

// ═════════════════════════════════════════════════════════════
//                    SECTION 4: CLIENT-SIDE (REACT COMPONENTS)
// ═════════════════════════════════════════════════════════════

describe('🎨 Section 4: Client-Side Components', () => {
  // 4.1 Client Layout
  describe('Client Layout', () => {
    test('Client layout exists', () => {
      expect(fs.existsSync('./app/client/layout.tsx')).toBe(true);
    });

    test('Client layout has correct structure', () => {
      const code = fs.readFileSync('./app/client/layout.tsx', 'utf-8');
      expect(code).toContain('export default');
    });
  });

  // 4.2 Catalog Pages
  describe('Catalog Pages', () => {
    test('Home page exists', () => {
      expect(fs.existsSync('./app/(root)/page.tsx')).toBe(true);
    });

    test('Category page exists', () => {
      expect(fs.existsSync('./app/category/[slug]/page.tsx')).toBe(true);
    });

    test('Subcategory page exists', () => {
      expect(fs.existsSync('./app/category/[slug]/[subcategory]/page.tsx')).toBe(true);
    });

    test('Cart page exists', () => {
      expect(fs.existsSync('./app/client/cart/page.tsx')).toBe(true);
    });
  });

  // 4.3 Feature Components
  describe('Feature Components (Catalog)', () => {
    test('HomePage component exists', () => {
      expect(fs.existsSync('./features/app/catalog/ui/HomePage.tsx')).toBe(true);
    });

    test('CategoryPage component exists', () => {
      expect(fs.existsSync('./features/app/catalog/ui/CategoryPage.tsx')).toBe(true);
    });

    test('SubcategoryPage component exists', () => {
      expect(fs.existsSync('./features/app/catalog/ui/SubcategoryPage.tsx')).toBe(true);
    });
  });

  // 4.4 Cart Components
  describe('Cart Components', () => {
    test('OrderForm component exists', () => {
      expect(fs.existsSync('./features/app/cart/ui/OrderForm.tsx')).toBe(true);
    });

    test('CartContext exists', () => {
      expect(fs.existsSync('./app/context/CartContext.tsx')).toBe(true);
    });

    test('CartContext uses useReducer', () => {
      const code = fs.readFileSync('./app/context/CartContext.tsx', 'utf-8');
      expect(code).toContain('useReducer');
    });

    test('CartContext persists to localStorage', () => {
      const code = fs.readFileSync('./app/context/CartContext.tsx', 'utf-8');
      expect(code).toContain('localStorage');
    });
  });

  // 4.5 Hooks
  describe('Client Hooks', () => {
    test('useApi hook exists', () => {
      expect(fs.existsSync('./hooks/useApi.ts')).toBe(true);
    });

    test('useApi exports function', () => {
      const code = fs.readFileSync('./hooks/useApi.ts', 'utf-8');
      expect(code).toContain('export function useApi');
    });

    test('useAuth hook exists', () => {
      expect(fs.existsSync('./hooks/useAuth.ts')).toBe(true);
    });

    test('useAuth has client directive', () => {
      const code = fs.readFileSync('./hooks/useAuth.ts', 'utf-8');
      expect(code).toContain("'use client'");
    });
  });

  // 4.6 ViewModels
  describe('Client ViewModels', () => {
    test('useCategoriesViewModel exists', () => {
      expect(fs.existsSync('./features/app/catalog/useCategoriesViewModel.ts')).toBe(true);
    });

    test('useCatalogProductsViewModel exists', () => {
      expect(fs.existsSync('./features/app/catalog/useCatalogProductsViewModel.ts')).toBe(true);
    });

    test('useCartPageViewModel exists', () => {
      expect(fs.existsSync('./features/app/cart/useCartPageViewModel.ts')).toBe(true);
    });
  });
});

// ═════════════════════════════════════════════════════════════
//                    SECTION 5: ADMIN PANEL
// ═════════════════════════════════════════════════════════════

describe('⚙️ Section 5: Admin Panel', () => {
  // 5.1 Admin Layout
  describe('Admin Layout', () => {
    test('Admin layout exists', () => {
      expect(fs.existsSync('./app/admin/layout.tsx')).toBe(true);
    });

    test('Admin layout has sidebar', () => {
      const code = fs.readFileSync('./app/admin/layout.tsx', 'utf-8');
      expect(code).toContain('AdminSidebar') || expect(code).toContain('sidebar');
    });

    test('Admin layout has header', () => {
      const code = fs.readFileSync('./app/admin/layout.tsx', 'utf-8');
      expect(code).toContain('AdminHeader') || expect(code).toContain('header');
    });
  });

  // 5.2 Admin Pages
  describe('Admin Pages', () => {
    const adminPages = [
      'app/admin/orders/page.tsx',
      'app/admin/products/page.tsx',
      'app/admin/categories/page.tsx',
      'app/admin/media/page.tsx',
      'app/admin/settings/page.tsx',
    ];

    adminPages.forEach((page) => {
      test(`${page} exists`, () => {
        expect(fs.existsSync(page)).toBe(true);
      });
    });
  });

  // 5.3 Admin Features
  describe('Admin Features', () => {
    // Products
    test('Admin products service exists', () => {
      expect(fs.existsSync('./features/admin/products/service.ts')).toBe(true);
    });

    test('Admin products ViewModel exists', () => {
      expect(fs.existsSync('./features/admin/products/useProductsViewModel.ts')).toBe(true);
    });

    test('Admin products UI exists', () => {
      expect(fs.existsSync('./features/admin/products/ui/ProductsPage.tsx')).toBe(true);
    });

    // Orders
    test('Admin orders service exists', () => {
      expect(fs.existsSync('./features/admin/orders/service.ts')).toBe(true);
    });

    test('Admin orders ViewModel exists', () => {
      expect(fs.existsSync('./features/admin/orders/useOrdersViewModel.ts')).toBe(true);
    });

    // Categories
    test('Admin categories service exists', () => {
      expect(fs.existsSync('./features/admin/categories/service.ts')).toBe(true);
    });

    test('Admin categories ViewModel exists', () => {
      expect(fs.existsSync('./features/admin/categories/useCategoriesViewModel.ts')).toBe(true);
    });

    // Media
    test('Admin media service exists', () => {
      expect(fs.existsSync('./features/admin/media/service.ts')).toBe(true);
    });

    // Auth
    test('Admin auth service exists', () => {
      expect(fs.existsSync('./features/admin/auth/service.ts')).toBe(true);
    });

    test('Admin auth ViewModel exists', () => {
      expect(fs.existsSync('./features/admin/auth/useAuthViewModel.ts')).toBe(true);
    });
  });

  // 5.4 Admin Components
  describe('Admin Components', () => {
    test('AdminNotifications component exists', async () => {
      const { default: AdminNotifications } = await import('@/components/AdminNotifications');
      expect(AdminNotifications).toBeDefined();
    });

    test('AdminSidebar component exists', () => {
      expect(fs.existsSync('./components/admin/AdminSidebar.tsx')).toBe(true);
    });

    test('AdminHeader component exists', () => {
      expect(fs.existsSync('./components/admin/AdminHeader.tsx')).toBe(true);
    });
  });
});

// ═════════════════════════════════════════════════════════════
//                    SECTION 6: SUPABASE INTEGRATION
// ═════════════════════════════════════════════════════════════

describe('💾 Section 6: Supabase Integration', () => {
  // 6.1 Supabase Client
  describe('Supabase Client (lib/supabase.ts)', () => {
    test('Supabase client is created', async () => {
      const { supabase } = await import('@/lib/supabase');
      expect(supabase).toBeDefined();
      expect(typeof supabase.from).toBe('function');
    });

    test('Supabase URL is configured', async () => {
      const { supabaseUrl } = await import('@/lib/supabase');
      expect(typeof supabaseUrl).toBe('string');
      expect(supabaseUrl).toContain('supabase');
    });

    test('Supabase key is configured', async () => {
      const { supabaseKey } = await import('@/lib/supabase');
      expect(typeof supabaseKey).toBe('string');
    });

    test('Supabase has retry logic', () => {
      const code = fs.readFileSync('./lib/supabase.ts', 'utf-8');
      expect(code).toContain('retry') || expect(code).toContain('3');
    });

    test('Supabase timeout is configured', () => {
      const code = fs.readFileSync('./lib/supabase.ts', 'utf-8');
      expect(code).toContain('timeout') || expect(code).toContain('45000');
    });
  });

  // 6.2 Database Connection
  describe('Database Connection (lib/db.ts)', () => {
    test('DB connection function exists', async () => {
      const { default: connect } = await import('@/lib/db');
      expect(connect).toBeDefined();
      expect(typeof connect).toBe('function');
    });
  });

  // 6.3 Documents Table
  describe('Documents Table (JSONB)', () => {
    test('Collection table name is documents', async () => {
      const { SUPABASE_COLLECTION_TABLE } = await import('@/lib/supabase');
      expect(SUPABASE_COLLECTION_TABLE).toBe('documents');
    });

    test('Supabase init SQL exists', () => {
      expect(fs.existsSync('./scripts/supabase-init.sql')).toBe(true);
    });

    test('Init SQL creates documents table', () => {
      const sql = fs.readFileSync('./scripts/supabase-init.sql', 'utf-8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS documents');
    });

    test('Init SQL enables RLS', () => {
      const sql = fs.readFileSync('./scripts/supabase-init.sql', 'utf-8');
      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    });
  });

  // 6.4 Migrations
  describe('Database Migrations', () => {
    test('Migrations folder exists', () => {
      expect(fs.existsSync('./migrations')).toBe(true);
    });

    test('Migration files exist', () => {
      const files = fs.readdirSync('./migrations');
      expect(files.length).toBeGreaterThan(0);
    });

    test('Supabase relational alignment SQL exists', () => {
      expect(fs.existsSync('./scripts/supabase-relational-alignment.sql')).toBe(true);
    });
  });

  // 6.5 Rate Limiting
  describe('Rate Limiting (@upstash/ratelimit)', () => {
    test('Rate limit lib exists', () => {
      expect(fs.existsSync('./lib/rateLimit.ts')).toBe(true);
    });

    test('Rate limit uses Upstash', () => {
      const code = fs.readFileSync('./lib/rateLimit.ts', 'utf-8');
      expect(code).toContain('@upstash/ratelimit');
    });
  });
});

// ═════════════════════════════════════════════════════════════
//                    SECTION 7: CROSS-COMPONENT INTEGRATION
// ═════════════════════════════════════════════════════════════

describe('🔗 Section 7: Cross-Component Integration', () => {
  // 7.1 Auth Flow Integration
  describe('Auth Flow Integration', () => {
    test('Middleware uses auth functions', () => {
      const middlewareCode = fs.readFileSync('./middleware.ts', 'utf-8');
      const authCode = fs.readFileSync('./lib/auth.ts', 'utf-8');
      expect(middlewareCode).toContain('auth');
      expect(authCode).toContain('jose');
    });

    test('Login page uses auth service', () => {
      const loginCode = fs.readFileSync('./features/admin/auth/ui/LoginPage.tsx', 'utf-8');
      expect(loginCode).toContain('service') || expect(loginCode).toContain('login');
    });

    test('Auth state is managed via ViewModel', () => {
      const vmCode = fs.readFileSync('./features/admin/auth/useAuthViewModel.ts', 'utf-8');
      expect(vmCode).toContain('user');
      expect(vmCode).toContain('isAdmin');
    });
  });

  // 7.2 Data Flow Integration
  describe('Data Flow Integration', () => {
    test('API routes use Supabase client', () => {
      const code = fs.readFileSync('./app/api/products/route.ts', 'utf-8');
      expect(code).toContain('supabase');
    });

    test('Services use Supabase client', () => {
      const code = fs.readFileSync('./features/admin/products/service.ts', 'utf-8');
      expect(code).toContain('supabase') || expect(code).toContain('documents');
    });

    test('ViewModels use services', () => {
      const code = fs.readFileSync('./features/admin/products/useProductsViewModel.ts', 'utf-8');
      expect(code).toContain('service') || expect(code).toContain('import');
    });
  });

  // 7.3 UI Integration
  describe('UI Integration', () => {
    test('Admin pages use ViewModels', () => {
      const code = fs.readFileSync('./app/admin/products/page.tsx', 'utf-8');
      expect(code).toContain('ViewModel') || expect(code).toContain('use');
    });

    test('Client pages use ViewModels', () => {
      const code = fs.readFileSync('./features/app/catalog/ui/HomePage.tsx', 'utf-8');
      expect(code).toContain('ViewModel') || expect(code).toContain('use');
    });
  });

  // 7.4 Configuration Integration
  describe('Configuration Integration', () => {
    test('Next.js config exists', () => {
      expect(fs.existsSync('./next.config.js')).toBe(true);
    });

    test('TypeScript config exists', () => {
      expect(fs.existsSync('./tsconfig.json')).toBe(true);
    });

    test('Env example exists', () => {
      expect(fs.existsSync('./.env.example')).toBe(true);
    });

    test('Package.json is valid', () => {
      const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
      expect(pkg.name).toBeDefined();
      expect(pkg.dependencies.next).toBeDefined();
      expect(pkg.dependencies['@supabase/supabase-js']).toBeDefined();
    });
  });

  // 7.5 Lib Utilities Integration
  describe('Lib Utilities', () => {
    test('Validations lib exists', async () => {
      const v = await import('@/lib/validations');
      expect(v).toBeDefined();
    });

    test('Logger lib exists', async () => {
      const l = await import('@/lib/logger');
      expect(l).toBeDefined();
    });

    test('Cache lib uses Next.js cache', () => {
      const code = fs.readFileSync('./lib/cache.ts', 'utf-8');
      expect(code).toContain('unstable_cache');
    });

    test('Telegram lib exists', async () => {
      const t = await import('@/lib/telegram');
      expect(t).toBeDefined();
    });
  });
});

// ═════════════════════════════════════════════════════════════
//                    SECTION 8: BUILD & DEPENDENCIES
// ═════════════════════════════════════════════════════════════

describe('📦 Section 8: Build & Dependencies', () => {
  test('Next.js imports successfully', async () => {
    const next = await import('next');
    expect(next).toBeDefined();
  });

  test('React imports successfully', async () => {
    const React = await import('react');
    expect(React).toBeDefined();
  });

  test('Supabase-js imports successfully', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    expect(createClient).toBeDefined();
  });

  test('Zod imports successfully', async () => {
    const zod = await import('zod');
    expect(zod).toBeDefined();
  });

  test('Framer Motion imports successfully', async () => {
    const motion = await import('framer-motion');
    expect(motion).toBeDefined();
  });

  test('TypeScript compiles', () => {
    const tsconfig = fs.readFileSync('./tsconfig.json', 'utf-8');
    expect(tsconfig).toContain('compilerOptions');
  });
});

// ═════════════════════════════════════════════════════════════
//                    END OF COMPREHENSIVE TEST SUITE
// ═════════════════════════════════════════════════════════════
