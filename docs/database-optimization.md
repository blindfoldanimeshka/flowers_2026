# Database Optimization

Date: 2026-04-21

## Summary

This update targets read performance and query count reduction in the Supabase-backed model layer.

## Changes

1. Batch populate improvements in `lib/supabaseModel.ts`
- `applyPopulate` now skips empty ID batches instead of issuing unnecessary calls.
- `items.productId` population now applies `select` correctly to populated product documents.
- Field projection logic was extracted into a reusable helper to keep behavior consistent.

2. Caching updates in `lib/cache.ts`
- Removed misleading `cached: false` payload fields from cached responses.
- Updated cache TTL values:
  - Products: `5 min -> 3 min`
  - Categories: `10 min -> 5 min`
  - Orders: `60 sec -> 30 sec`
- Added lightweight cache access metrics (`hits`, `misses`, timestamps) via `getCacheStats()`.

3. Index script for Supabase
- Added `scripts/create-indexes.sql` with indexes for common filters and sorting:
  - `slug`, `categoryId`, `subcategoryId`
  - `status`, `customer.email`, `inStock`, `isActive`
  - `fulfillmentMethod`, `created_at DESC`

## Expected Impact

- Fewer populate-related queries and less repeated processing.
- Faster response times for product/category/order-heavy endpoints.
- Lower database load for common API access patterns.

## How To Apply Indexes

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Run `scripts/create-indexes.sql`.
4. Verify created indexes with:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'documents'
ORDER BY indexname;
```

