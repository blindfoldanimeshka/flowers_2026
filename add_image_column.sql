-- Add image column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image TEXT;

-- Add comment
COMMENT ON COLUMN categories.image IS 'URL изображения категории';
