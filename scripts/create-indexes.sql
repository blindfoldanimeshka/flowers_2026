-- Supabase indexes for documents table performance.
-- Usage:
-- 1) Open Supabase Dashboard -> SQL Editor
-- 2) Run this script
-- 3) Verify:
--    SELECT indexname, indexdef
--    FROM pg_indexes
--    WHERE tablename = 'documents'
--    ORDER BY indexname;

CREATE INDEX IF NOT EXISTS idx_documents_collection_slug
ON documents (collection, ((doc->>'slug')));

CREATE INDEX IF NOT EXISTS idx_documents_collection_categoryId
ON documents (collection, ((doc->>'categoryId')));

CREATE INDEX IF NOT EXISTS idx_documents_collection_subcategoryId
ON documents (collection, ((doc->>'subcategoryId')));

CREATE INDEX IF NOT EXISTS idx_documents_collection_status
ON documents (collection, ((doc->>'status')));

CREATE INDEX IF NOT EXISTS idx_documents_collection_customer_email
ON documents (collection, ((doc->'customer'->>'email')));

CREATE INDEX IF NOT EXISTS idx_documents_collection_inStock
ON documents (collection, ((doc->>'inStock')));

CREATE INDEX IF NOT EXISTS idx_documents_collection_isActive
ON documents (collection, ((doc->>'isActive')));

CREATE INDEX IF NOT EXISTS idx_documents_created_at_desc
ON documents (collection, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_collection_fulfillmentMethod
ON documents (collection, ((doc->>'fulfillmentMethod')));

