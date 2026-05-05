-- Migration: Add image_url column to categories table
-- Date: 2026-05-05
-- Description: Adds image_url field to categories to allow setting category images

ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN categories.image_url IS 'URL изображения категории';
