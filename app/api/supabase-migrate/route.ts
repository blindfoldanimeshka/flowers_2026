import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth';
import { withErrorHandler } from '@/lib/errorHandler';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Supabase не настроен' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const migrationSQL = `
-- Adds missing catalog columns required by app/api/products routes.
-- Safe to run multiple times.

alter table public.products
  add column if not exists images text[] not null default '{}'::text[],
  add column if not exists category_ids text[] not null default '{}'::text[],
  add column if not exists category_num_id integer not null default 0,
  add column if not exists subcategory_num_id integer not null default 0,
  add column if not exists preorder_only boolean not null default false,
  add column if not exists assembly_time text not null default '',
  add column if not exists stock_quantity integer not null default 0,
  add column if not exists stock_unit text not null default 'шт.',
  add column if not exists pinned_in_category text;

-- Backfill arrays from legacy scalar fields.
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

-- Keep products/subcategories relationship consistent:
-- if a product has subcategory_id, that subcategory must belong to the same category_id.
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

-- Helpful indexes for category listing and pin sorting.
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_subcategory_id_idx on public.products (subcategory_id);
create index if not exists products_pinned_in_category_idx on public.products (pinned_in_category);
create index if not exists products_category_ids_gin_idx on public.products using gin (category_ids);
`;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('Migration error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Миграция выполнена успешно' });
  } catch (error: any) {
    console.error('Migration exception:', error);
    return NextResponse.json({ error: error.message || 'Ошибка выполнения миграции' }, { status: 500 });
  }
});
