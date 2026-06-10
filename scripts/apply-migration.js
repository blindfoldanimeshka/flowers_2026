const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load from .env.local or use hardcoded fallback for development
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Development fallback (from run-migration.js)
if (!supabaseUrl) {
  supabaseUrl = 'https://jnbopvwnwyummzvsqjcj.supabase.co';
  console.log('ℹ️  Using default Supabase URL');
}

if (!supabaseKey) {
  supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYm9wdndud3l1bW16dnNxamNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI3MzkxNywiZXhwIjoyMDg5ODQ5OTE3fQ.DFtu_0vAe6gusCWMNC0DAFIVJ1nYjuEZsj7S6AOSgck';
  console.log('ℹ️  Using default Supabase service role key');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration(migrationFile) {
  try {
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    console.log(`Applying migration: ${path.basename(migrationFile)}`);
    
    const { data, error } = await supabase.rpc('exec', { sql });

    if (error) {
      console.error(`❌ Error applying migration:`, error.message);
      return false;
    } else {
      console.log(`✅ Migration applied successfully`);
      return true;
    }
  } catch (err) {
    console.error(`❌ Exception:`, err.message);
    return false;
  }
}

async function main() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Usage: node apply-migrations.js <migration-file>');
    console.error('Example: node apply-migrations.js add_image_column_to_subcategories.sql');
    process.exit(1);
  }

  const fullPath = path.join(migrationsDir, migrationFile);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Migration file not found: ${fullPath}`);
    process.exit(1);
  }

  const success = await applyMigration(fullPath);
  process.exit(success ? 0 : 1);
}

main();
