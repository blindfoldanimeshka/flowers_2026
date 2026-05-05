# Design: Comprehensive Test File + Refactor Spec

**Date**: 2026-05-05
**Project**: FloraMix Flower Shop Platform
**Approach**: Core-First (auth → API → client → admin → integrations)

## Project Analysis Summary

**Stack**: Next.js 16 + React 19 + TypeScript + Supabase
**Structure**: Monolith with `/app/client/`, `/app/admin/`, `/app/api/` (30+ endpoints)
**Existing tests**: `__tests__/integration.test.ts`, `validations.test.ts`, `utils.test.ts`
**Coverage threshold**: 70%

**Critical Issues Found**:
1. Supabase RLS enabled but NO policies (blocks all access unless service role)
2. Mixed architecture: JSONB documents table + relational tables
3. Feature flags (USE_SUPABASE_*) suggest incomplete migration
4. No admin-specific tests

## Design 1: Comprehensive Test File

**File**: `__tests__/comprehensive.test.ts`

### Structure (7 Sections, Core-First Order)

```typescript
/**
 * Comprehensive Test Suite - FloraMix Platform
 * Core-First Approach: auth → API → client → admin → integrations
 */

// Section 1: Setup & Mocks
// - Mock Supabase client (lib/supabase.ts)
// - Mock env variables
// - Test utilities for JWT, CSRF

// Section 2: Auth & Middleware (CRITICAL)
// - JWT creation/verification (lib/auth.ts)
// - Middleware: admin route protection
// - Middleware: API route auth
// - CSRF token validation (lib/csrf.ts)
// - Login/logout endpoints

// Section 3: API Routes (30+ endpoints)
// - Products: CRUD, featured, filter, search, by-category, by-subcategory
// - Categories: CRUD, stats, reorder, subcategories
// - Subcategories: CRUD
// - Orders: CRUD, latest, status updates
// - Settings: get/update
// - Upload: single, multiple, media-library
// - Health/performance/stats

// Section 4: Client-Side (React components)
// - Catalog: HomePage, CategoryPage, SubcategoryPage
// - Cart: CartContext, OrderForm, cart page
// - Navigation and routing

// Section 5: Admin Panel
// - Admin layout with sidebar
// - Products management UI
// - Orders management UI
// - Categories with drag-drop
// - Media gallery upload/delete

// Section 6: Supabase Integration
// - Connection (lib/db.ts)
// - Documents table operations
// - RLS policies (after fix)
// - Rate limiting (@upstash/ratelimit)

// Section 7: Cross-Component Integration
// - Order flow: client selects → checkout → admin sees order
// - Auth flow: login → access admin → logout
// - Media: upload → display in products
```

## Design 2: Refactor Spec

**File**: `docs/superpowers/specs/refactor_codex_subagents.md`

### Goal
Make FloraMix fully functional (focus: fix core functionality)

### Phases

#### Phase 1: Critical Fixes (Subagent 1)
**1.1 Fix Supabase RLS Policies**
- Add RLS policies for documents table (public read, service role write)
- Or disable RLS if using service role only
- Test: Connection no longer blocked

**1.2 Complete Supabase Migration**
- Remove feature flags (USE_SUPABASE_*)
- Standardize on relational tables (categories, products, orders)
- Deprecate JSONB documents table OR document migration path
- Test: All API routes work with relational queries

**1.3 Fix Auth Flow**
- Verify JWT middleware works with new Supabase setup
- Test CSRF protection
- Ensure admin login works end-to-end
- Test: Can login, access admin, logout

#### Phase 2: Feature Completion (Subagent 2)
**2.1 Complete Admin Features**
- Products: CRUD, image upload, category assignment
- Orders: Status updates, filtering
- Categories: Drag-drop reorder, subcategories
- Media: Upload, delete, sync

**2.2 Complete Client Features**
- Catalog browsing with filters
- Cart with persistence
- Checkout with order creation
- Order tracking

#### Phase 3: Testing & Validation (Subagent 3)
**3.1 Write comprehensive test file (__tests__/comprehensive.test.ts)**
**3.2 Achieve 70% coverage threshold**
**3.3 Manual testing checklist**

### Success Criteria
- [ ] All API endpoints return 200 (not 401/403/500)
- [ ] Admin can login and manage products/orders
- [ ] Client can browse, add to cart, checkout
- [ ] Test coverage ≥70%

## Spec Self-Review Checklist
- [x] No placeholders (TBD, TODO)
- [x] Internal consistency (phases align with design)
- [x] Scope appropriate for single implementation
- [x] No ambiguous requirements
