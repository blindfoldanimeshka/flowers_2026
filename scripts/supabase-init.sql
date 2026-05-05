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

-- RLS: public read access for categories/products documents, admin full access.
-- categories collection = 2, products collection = 4.
drop policy if exists documents_public_read_catalog on public.documents;
create policy documents_public_read_catalog
on public.documents
for select
to public
using (collection in ('2', '4'));

drop policy if exists documents_admin_full_access_select on public.documents;
create policy documents_admin_full_access_select
on public.documents
for select
to authenticated
using (
  auth.role() = 'service_role'
  or coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

drop policy if exists documents_admin_full_access_insert on public.documents;
create policy documents_admin_full_access_insert
on public.documents
for insert
to authenticated
with check (
  auth.role() = 'service_role'
  or coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

drop policy if exists documents_admin_full_access_update on public.documents;
create policy documents_admin_full_access_update
on public.documents
for update
to authenticated
using (
  auth.role() = 'service_role'
  or coalesce(auth.jwt() ->> 'role', '') = 'admin'
)
with check (
  auth.role() = 'service_role'
  or coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

drop policy if exists documents_admin_full_access_delete on public.documents;
create policy documents_admin_full_access_delete
on public.documents
for delete
to authenticated
using (
  auth.role() = 'service_role'
  or coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

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
