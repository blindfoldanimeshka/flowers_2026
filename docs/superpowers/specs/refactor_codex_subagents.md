# Refactor Plan: FloraMix to Production-Ready

**Target**: Make FloraMix fully functional for end users
**Approach**: Codex GPT with subagents (3 subagents working in parallel)
**Priority**: Fix core functionality (RLS, auth, DB migration)

---

## Current State Analysis

### Critical Issues Found
1. **RLS Misconfigured**: Enabled on `documents` table but NO policies (blocks all access unless service role key used)
2. **Mixed Architecture**: JSONB `documents` table + relational tables (categories, products, orders)
3. **Incomplete Migration**: Feature flags (`USE_SUPABASE_*`) suggest partial migration
4. **Test Coverage Gap**: No admin-specific tests, coverage below 70% threshold

### Architecture Overview
```
FloraMix (Next.js 16 + React 19 + TypeScript + Supabase)
├── Client Layer (app/client/, features/app/)
├── Admin Layer (app/admin/, features/admin/)
├── API Layer (app/api/ - 30+ endpoints)
├── Lib Layer (lib/ - auth, supabase, csrf, etc.)
└── Database (Supabase PostgreSQL)
```

---

## Phase 1: Critical Fixes (Subagent 1 - "Backend Fixer")

### 1.1 Fix Supabase RLS Policies

**Problem**: RLS enabled but no policies = all access blocked for non-service requests

**Solution Options**:
- **Option A**: Add proper RLS policies (recommended for production)
- **Option B**: Disable RLS (quick fix, less secure)

**Recommended**: Option A with policies:
```sql
-- Public read access for products, categories
CREATE POLICY "Public read products" ON documents FOR SELECT USING (doc->>'collection' = '4');
CREATE POLICY "Public read categories" ON documents FOR SELECT USING (doc->>'collection' = '1');

-- Service role full access (already works)
-- Authenticated admin full access
CREATE POLICY "Admin full access" ON documents FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

**Files to modify**:
- `scripts/supabase-init.sql` (add policies)
- Or apply via Supabase dashboard / migration

**Validation**: Run `npm test` → Section 6 (Supabase Integration) tests pass

---

### 1.2 Complete Supabase Migration

**Problem**: Feature flags (`USE_SUPABASE_CATALOG`, `USE_SUPABASE_SETTINGS`, etc.) indicate incomplete migration from JSONB to relational tables

**Tasks**:
1. Remove all `USE_SUPABASE_*` feature flags from:
   - `.env` / `.env.example`
   - Code that checks these flags (search with grep)

2. Standardize on relational tables:
   - `categories` table (already exists per migration)
   - `subcategories` table (already exists)
   - `products` table (already exists)
   - `orders` table (already exists)
   - `settings` table (already exists)

3. Deprecate `documents` table OR create clear migration path:
   - Option A: Keep both, documents for legacy, relational for new code
   - Option B: Migrate all data from documents to relational tables

**Recommended**: Option A (keep both during transition, use relational for new code)

**Files to modify**:
- `app/api/*/route.ts` (ensure uses relational queries)
- `features/*/service.ts` (ensure uses relational queries)
- `lib/supabaseModel.ts` (deprecate or remove)
- `.env.example` (remove feature flags)

**Validation**: All API routes return 200 (not 500), `npm test` passes

---

### 1.3 Fix Auth Flow

**Problem**: JWT auth with `jose`, middleware protection, CSRF - needs validation

**Tasks**:
1. Verify `lib/auth.ts` works:
   - `createToken()` creates valid JWT
   - `verifyToken()` verifies JWT
   - `requireAdmin()` middleware works

2. Verify `middleware.ts`:
   - Protects `/admin/*` routes
   - Protects mutating API routes
   - Allows public API routes (GET /api/products, /api/categories, etc.)
   - Allows POST /api/orders (public checkout)

3. Verify CSRF protection:
   - `lib/csrf.ts` validates tokens
   - Mutating requests require valid CSRF token

4. Test admin login end-to-end:
   - POST /api/auth/login with credentials
   - Receives `auth_token` cookie
   - Can access /api/auth/me
   - Can access /admin routes

**Files to verify/modify**:
- `lib/auth.ts`
- `middleware.ts`
- `lib/csrf.ts`
- `features/admin/auth/service.ts`

**Validation**: Admin can login, access admin panel, logout successfully

---

## Phase 2: Feature Completion (Subagent 2 - "Feature Builder")

### 2.1 Complete Admin Features

**Products Management** (`features/admin/products/`):
- [ ] CRUD operations work (create, read, update, delete)
- [ ] Image upload (up to 3 images per product)
- [ ] Category/subcategory assignment
- [ ] Stock management (inStock, preorderOnly, stockQuantity)
- [ ] Product pinning in categories
- [ ] Search functionality

**Orders Management** (`features/admin/orders/`):
- [ ] Fetch all orders (`getAdminOrders()`)
- [ ] Update order status (pending → confirmed → preparing → delivering → delivered)
- [ ] Delete orders (`deleteAdminOrder()`)
- [ ] Order filtering

**Categories Management** (`features/admin/categories/`):
- [ ] Create categories and subcategories
- [ ] Update with drag-and-drop reordering (@dnd-kit)
- [ ] Delete categories/subcategories
- [ ] Image upload for categories
- [ ] Display product counts per category

**Media Gallery** (`features/admin/media/`):
- [ ] Upload images (drag-and-drop, up to 100MB)
- [ ] Delete single/bulk images
- [ ] Sync bucket with Supabase storage
- [ ] Copy image URLs to clipboard
- [ ] Search media by URL

**Settings** (`app/admin/settings/`):
- [ ] Store settings management via SettingsForm
- [ ] Payment settings configuration

---

### 2.2 Complete Client Features

**Catalog Browsing** (`features/app/catalog/`):
- [ ] Home page with featured products
- [ ] Category page with products
- [ ] Subcategory page with products
- [ ] Product filtering and search
- [ ] Product detail view

**Shopping Cart** (`app/context/CartContext.tsx`):
- [ ] Add/remove items from cart
- [ ] Update quantities
- [ ] Cart persistence via localStorage
- [ ] Cart page with order form

**Checkout Flow**:
- [ ] Order form validation (Zod)
- [ ] Order creation (POST /api/orders)
- [ ] Order confirmation
- [ ] Telegram notification on new order (lib/telegram/bot.js)

---

## Phase 3: Testing & Validation (Subagent 3 - "Test Master")

### 3.1 Write Comprehensive Test File

**File**: `__tests__/comprehensive.test.ts` (ALREADY CREATED)

**Sections**:
1. Setup & Mocks
2. Auth & Middleware (CRITICAL)
3. API Routes (30+ endpoints)
4. Client-Side Components
5. Admin Panel
6. Supabase Integration
7. Cross-Component Integration
8. Build & Dependencies

**Current Status**: ✅ Written, needs to pass

---

### 3.2 Achieve 70% Coverage Threshold

**Current config** (`jest.config.js`):
```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

**Tasks**:
1. Run `npm run test:coverage`
2. Identify low-coverage files
3. Add tests for:
   - `lib/auth.ts`
   - `lib/csrf.ts`
   - `middleware.ts`
   - `features/admin/**`
   - `features/app/**`
4. Re-run coverage until ≥70% achieved

---

### 3.3 Manual Testing Checklist

**Admin Panel**:
- [ ] Login with admin credentials (AdminFlows / KMFlAdmin)
- [ ] Create/edit/delete products
- [ ] Upload product images
- [ ] Create/edit/delete categories
- [ ] Reorder categories (drag-drop)
- [ ] View/manage orders
- [ ] Update order status
- [ ] Upload/delete media
- [ ] Update store settings

**Client Store**:
- [ ] Browse homepage
- [ ] Navigate categories/subcategories
- [ ] View product details
- [ ] Add products to cart
- [ ] Update cart quantities
- [ ] Remove items from cart
- [ ] Checkout with order form
- [ ] Receive order confirmation
- [ ] (Optional) Receive Telegram notification

**API Endpoints**:
- [ ] All GET endpoints return 200
- [ ] All POST/PUT/DELETE endpoints require auth (except POST /api/orders)
- [ ] CSRF protection works
- [ ] Rate limiting works (@upstash/ratelimit)

---

## Success Criteria (Definition of Done)

### Critical (Must Have):
- [ ] Supabase RLS fixed (policies added or RLS disabled)
- [ ] All API endpoints return 200 (not 401/403/500)
- [ ] Admin can login and manage products/orders/categories/media
- [ ] Client can browse catalog, add to cart, checkout
- [ ] Test coverage ≥70%

### Important (Should Have):
- [ ] Feature flags removed, migration complete
- [ ] All admin features working (CRUD, drag-drop, media)
- [ ] All client features working (catalog, cart, checkout)
- [ ] Telegram notifications working

### Nice to Have:
- [ ] Performance optimizations
- [ ] SEO optimizations
- [ ] Accessibility improvements
- [ ] Error handling improvements

---

## Subagent Task Distribution

### Subagent 1: "Backend Fixer"
**Focus**: Phase 1 (Critical Fixes)
**Skills**: Supabase, SQL, Next.js API routes, JWT auth
**Deliverables**:
1. Fixed RLS policies (or disabled)
2. Completed migration (removed feature flags)
3. Validated auth flow
4. All API endpoints working

### Subagent 2: "Feature Builder"
**Focus**: Phase 2 (Feature Completion)
**Skills**: React, Next.js, UI/UX, Form validation
**Deliverables**:
1. All admin features working
2. All client features working
3. Drag-drop reordering
4. Image uploads

### Subagent 3: "Test Master"
**Focus**: Phase 3 (Testing & Validation)
**Skills**: Jest, Testing Library, Coverage analysis
**Deliverables**:
1. Comprehensive test file passing
2. 70% coverage achieved
3. Manual testing checklist completed
4. Bug reports (if any)

---

## Execution Order

1. **Subagent 1** starts immediately (critical path)
2. **Subagent 2** can start in parallel (independent features)
3. **Subagent 3** starts after Subagent 1 & 2 have deliverables to test

**Total Estimated Time**: 2-3 hours with 3 subagents working in parallel

---

## Notes for Codex GPT

- Use `@/` path alias for imports (configured in jest.config.js and tsconfig.json)
- Mock environment variables in `jest.setup.js`
- Next.js router and navigation are already mocked
- Supabase client should be mocked in tests (see `__tests__/comprehensive.test.ts` Section 6)
- Follow existing code patterns in `features/` directory (ViewModel + Service architecture)
- Use Zod for form validations
- Use Tailwind CSS + Framer Motion for UI
