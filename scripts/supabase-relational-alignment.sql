-- Align Supabase schema with application relational mode.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

alter table public.categories
  add column if not exists is_active boolean not null default true,
  add column if not exists image_url text null,
  add column if not exists sort_order integer not null default 0;

alter table public.subcategories
  add column if not exists category_num_id integer not null default 0,
  add column if not exists description text null,
  add column if not exists image_url text null;

alter table public.products
  add column if not exists images text[] not null default '{}'::text[],
  add column if not exists category_ids text[] not null default '{}'::text[],
  add column if not exists category_num_id integer not null default 0,
  add column if not exists subcategory_num_id integer not null default 0,
  add column if not exists preorder_only boolean not null default false,
  add column if not exists assembly_time text not null default '',
  add column if not exists stock_quantity integer not null default 0,
  add column if not exists stock_unit text not null default 'шт.',
  add column if not exists pinned_in_category text null;

alter table public.settings
  add column if not exists contact_phone2 text null,
  add column if not exists contact_phone3 text null,
  add column if not exists pickup_hours text null,
  add column if not exists delivery_hours text null,
  add column if not exists delivery_info text null,
  add column if not exists home_category_card_backgrounds jsonb null default '{}'::jsonb,
  add column if not exists home_banner_background text null,
  add column if not exists home_banner_slides jsonb null default '[]'::jsonb,
  add column if not exists media_library jsonb null default '[]'::jsonb;

create index if not exists idx_products_category_id on public.products using btree (category_id);
create index if not exists idx_products_subcategory_id on public.products using btree (subcategory_id);
create index if not exists idx_products_is_featured on public.products using btree (is_featured);
create index if not exists idx_products_category_ids on public.products using gin (category_ids);
create index if not exists idx_subcategories_category_num_id on public.subcategories using btree (category_num_id);
create index if not exists idx_categories_sort_order on public.categories using btree (sort_order);

update public.products
set images = case
    when coalesce(image_url, '') <> '' then array[image_url]
    else '{}'::text[]
  end
where images is null or cardinality(images) = 0;

update public.products
set category_ids = case
    when category_id is not null then array[category_id::text]
    else '{}'::text[]
  end
where category_ids is null or cardinality(category_ids) = 0;

update public.products p
set subcategory_id = null
where p.subcategory_id is not null
  and not exists (
    select 1
    from public.subcategories s
    where s.id = p.subcategory_id
      and s.category_id = p.category_id
  );

create or replace function public.validate_products_subcategory_category_match()
returns trigger
language plpgsql
as $$
begin
  if new.subcategory_id is null then
    return new;
  end if;

  if exists (
    select 1
    from public.subcategories s
    where s.id = new.subcategory_id
      and s.category_id = new.category_id
  ) then
    return new;
  end if;

  raise exception 'products.subcategory_id (%) does not belong to products.category_id (%)',
    new.subcategory_id, new.category_id;
end;
$$;

drop trigger if exists trg_validate_products_subcategory_category_match on public.products;

create trigger trg_validate_products_subcategory_category_match
before insert or update of category_id, subcategory_id
on public.products
for each row
execute function public.validate_products_subcategory_category_match();
