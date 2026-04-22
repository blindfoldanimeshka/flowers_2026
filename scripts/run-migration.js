const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jnbopvwnwyummzvsqjcj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYm9wdndud3l1bW16dnNxamNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI3MzkxNywiZXhwIjoyMDg5ODQ5OTE3fQ.DFtu_0vAe6gusCWMNC0DAFIVJ1nYjuEZsj7S6AOSgck';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Starting migration...');

  const steps = [
    {
      name: 'Add images column',
      sql: `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}'::text[]`
    },
    {
      name: 'Add category_ids column',
      sql: `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_ids text[] NOT NULL DEFAULT '{}'::text[]`
    },
    {
      name: 'Add category_num_id column',
      sql: `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_num_id integer NOT NULL DEFAULT 0`
    },
    {
      name: 'Add subcategory_num_id column',
      sql: `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory_num_id integer NOT NULL DEFAULT 0`
    },
    {
      name: 'Add preorder_only column',
      sql: `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS preorder_only boolean NOT NULL DEFAULT false`
    },
    {
      name: 'Add assembly_time column',
      sql: `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS assembly_time text NOT NULL DEFAULT ''`
    },
    {
      name: 'Add stock_quantity column',
      sql: `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0`
    },
    {
      name: 'Add stock_unit column',
      sql: `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_unit text NOT NULL DEFAULT 'шт.'`
    },
    {
      name: 'Add pinned_in_category column',
      sql: `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pinned_in_category text`
    },
    {
      name: 'Backfill images from image_url',
      sql: `UPDATE public.products SET images = CASE WHEN coalesce(image_url, '') <> '' THEN array[image_url] ELSE '{}'::text[] END WHERE images IS NULL OR cardinality(images) = 0`
    },
    {
      name: 'Backfill category_ids from category_id',
      sql: `UPDATE public.products SET category_ids = CASE WHEN coalesce(category_id, '') <> '' THEN array[category_id] ELSE '{}'::text[] END WHERE category_ids IS NULL OR cardinality(category_ids) = 0`
    },
    {
      name: 'Create index on category_id',
      sql: `CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products (category_id)`
    },
    {
      name: 'Create index on subcategory_id',
      sql: `CREATE INDEX IF NOT EXISTS products_subcategory_id_idx ON public.products (subcategory_id)`
    },
    {
      name: 'Create index on pinned_in_category',
      sql: `CREATE INDEX IF NOT EXISTS products_pinned_in_category_idx ON public.products (pinned_in_category)`
    },
    {
      name: 'Create GIN index on category_ids',
      sql: `CREATE INDEX IF NOT EXISTS products_category_ids_gin_idx ON public.products USING gin (category_ids)`
    }
  ];

  for (const step of steps) {
    try {
      console.log(`Executing: ${step.name}...`);
      const { data, error } = await supabase.rpc('exec', { sql: step.sql });

      if (error) {
        console.error(`❌ Error in ${step.name}:`, error.message);
      } else {
        console.log(`✅ ${step.name} completed`);
      }
    } catch (err) {
      console.error(`❌ Exception in ${step.name}:`, err.message);
    }
  }

  console.log('\nMigration completed!');
}

runMigration().catch(console.error);
