# Design: Supabase Refactor (Replace Broken ORM)

## Executive Summary

**Goal:** Replace broken ORM (`lib/supabaseModel.ts` ~800 lines) with direct Supabase queries in each API route.

**Approach:** Priority-based refactoring using 3 subagents, each with Context7 documentation.

**Scope:** 50+ files across API routes, services, and models.

---

## Section 1: Architecture

### Current (Broken)
```
API Route → ORM (supabaseModel.ts) → Supabase Client → Database
            ↑
        800 lines, broken query building, silent filter drops
```

### New (Direct Queries)
```
API Route → Supabase Client (direct) → Database
            ↑
        Simple, debuggable, no magic
```

### Key Principles
1. **No ORM** — Direct Supabase JS client calls
2. **Type-safe** — Define interfaces for request/response
3. **Error handling** — Log actual Supabase errors with context
4. **Consistent** — Same pattern across all routes

---

## Section 2: Components

### Priority 1 (Critical) — Subagent 1
**Files:** 10 files
- `app/api/auth/login/route.ts` ✅ (already done, verify)
- `app/api/orders/route.ts`
- `app/api/orders/latest/route.ts`
- `app/api/orders/[id]/route.ts`
- `app/api/products/route.ts`
- `app/api/products/[id]/route.ts`
- `app/api/products/by-category/[categoryId]/route.ts`
- `app/api/products/by-subcategory/[subcategoryId]/route.ts`
- `app/api/products/search/route.ts`
- `app/api/products/filter/route.ts`

**Context7 Library:** `/supabase/supabase` (PostgreSQL direct queries, filter patterns)

### Priority 2 (Important) — Subagent 2
**Files:** 8 files
- `app/api/categories/route.ts`
- `app/api/categories/[id]/route.ts`
- `app/api/subcategories/route.ts`
- `app/api/subcategories/[id]/route.ts`
- `app/api/settings/route.ts`
- `app/api/payments/settings/route.ts`
- `app/api/payments/process/route.ts`
- `app/api/media-library/route.ts`

### Priority 3 (Nice-to-have) — Subagent 3
**Files:** ~15 files
- `features/*/services.ts` (frontend services)
- `lib/cache.ts` (cached queries)
- `models/*.ts` (can be deleted after refactor)
- `lib/supabaseModel.ts` (delete after all migrations)

---

## Section 3: Data Flow

### Example: Orders API (After Refactor)
```typescript
// app/api/orders/route.ts
export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const email = searchParams.get('email');
  
  let query = supabase
    .from('documents')
    .select('id, doc, created_at, updated_at')
    .eq('collection', 5); // orders
  
  if (status) {
    query = query.eq('doc->>status', status);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    console.error('[ORDERS] Supabase error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  
  const orders = data.map(row => ({
    _id: row.id,
    ...JSON.parse(row.doc),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  
  return NextResponse.json({ orders });
};
```

**Key Points:**
- Direct `.eq('collection', 5)` for filtering by collection
- JSONB access: `doc->>status` for fields inside doc
- Error logging with context
- Manual mapping from DB rows to response objects

---

## Section 4: Error Handling

### Standard Pattern
```typescript
const { data, error } = await supabase...;

if (error) {
  console.error('[API] Supabase error:', { 
    message: error.message, 
    code: error.code, 
    details: error.details,
    hint: error.hint 
  });
  return NextResponse.json(
    { error: 'Database error' }, 
    { status: 500 }
  );
}
```

---

## Section 5: Testing Strategy

After each subagent completes:
1. **TypeScript compilation:** `npx tsc --noEmit`
2. **Dev server test:** Navigate to affected pages
3. **API test:** `curl -s http://localhost:3000/api/...`
4. **Browser console:** Check for errors

---

## Success Criteria

- [ ] All API routes return valid JSON (no 500 errors)
- [ ] Orders page loads with data
- [ ] Products page loads with data
- [ ] Categories/Subcategories work
- [ ] Login works (already ✅)
- [ ] No TypeScript errors
- [ ] `lib/supabaseModel.ts` deleted
- [ ] `models/*.ts` deleted

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-------------|
| Breaking changes across many files | Priority-based, subagents work independently |
| JSONB query syntax errors | Use Context7 docs for Supabase |
| TypeScript errors in refactored code | Each subagent verifies before returning |
| Regression in working features | Test after each subagent completes |

---

**Design Status:** ✅ Approved by user  
**Next Step:** Invoke `writing-plans` skill to create implementation plan
