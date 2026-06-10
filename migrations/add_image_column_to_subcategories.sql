-- Migration: Add image column to subcategories table
-- Date: 2026-06-10
-- Description: Adds image field to subcategories to allow setting subcategory images

ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS image TEXT;

COMMENT ON COLUMN subcategories.image IS 'URL изображения подкатегории';
