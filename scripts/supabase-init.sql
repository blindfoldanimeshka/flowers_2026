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

-- Atomic order counter increment function with race condition fix
-- Uses INSERT ... ON CONFLICT DO UPDATE for atomic upsert
create or replace function public.increment_order_counter(p_date_key text)
returns int as $$
declare
  v_next_seq int;
begin
  insert into public.documents (collection, doc)
  values ('6'::text, jsonb_build_object('dateKey', p_date_key, 'seq', 1))
  on conflict (collection, (doc->>'dateKey'))
  do update set doc = public.documents.doc ||
    jsonb_build_object('seq', (public.documents.doc->>'seq')::int + 1)
  returning (doc->>'seq')::int into v_next_seq;

  return v_next_seq;
end;
$$ language plpgsql volatile;

-- Unique index to enforce atomic upsert behavior
-- Ensures only one counter per dateKey for collection = 6
create unique index if not exists documents_order_counter_datekey_idx
on public.documents ((doc->>'dateKey'))
where collection = '6';
