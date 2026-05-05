-- Migration: Add image column to categories table
-- Date: 2026-05-05
-- Description: Adds image field to categories to allow setting category images

ALTER TABLE categories ADD COLUMN IF NOT EXISTS image TEXT;

COMMENT ON COLUMN categories.image IS 'URL изображения категории';
