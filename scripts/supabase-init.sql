-- Create universal JSON documents table for Supabase-backed models
create extension if not exists pgcrypto;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  collection text not null,
  doc jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_collection_idx on public.documents (collection);
create index if not exists documents_doc_gin_idx on public.documents using gin (doc);

alter table public.documents enable row level security;

-- For server-side usage with SERVICE_ROLE key, RLS can stay enabled.
-- If you use only anon key on backend, add explicit policies as needed.
