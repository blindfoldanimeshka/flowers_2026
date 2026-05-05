-- Add tg_id column to settings table for storing multiple Telegram IDs
-- This allows multiple users to receive order notifications

alter table public.settings
  add column if not exists tg_id bigint[] null default null;

comment on column public.settings.tg_id is 'Array of Telegram user IDs for order notifications';
