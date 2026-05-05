-- Update tg_id column type to text[] to support Telegram IDs as strings
-- Storing as text is more flexible and avoids numeric overflow issues

-- Drop the old column if it exists with wrong type
alter table public.settings
  drop column if exists tg_id;

-- Add the column with text array type
alter table public.settings
  add column if not exists tg_id text[] null default null;

comment on column public.settings.tg_id is 'Array of Telegram user IDs for order notifications (stored as text)';
