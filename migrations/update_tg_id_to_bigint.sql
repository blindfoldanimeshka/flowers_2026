-- Update tg_id column type from int2[] to bigint[] to support large Telegram IDs
-- Telegram IDs can be very large numbers (e.g., 123456789), which exceed int2 range

-- Drop the old column if it exists with wrong type
alter table public.settings
  drop column if exists tg_id;

-- Add the column with correct type
alter table public.settings
  add column if not exists tg_id bigint[] null default null;

comment on column public.settings.tg_id is 'Array of Telegram user IDs for order notifications (bigint to support large IDs)';
