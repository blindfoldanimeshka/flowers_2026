const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jnbopvwnwyummzvsqjcj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Creating aggregate SQL functions...');

  const steps = [
    {
      name: 'get_total_revenue function',
      sql: `
        CREATE OR REPLACE FUNCTION get_total_revenue()
        RETURNS BIGINT AS $$
          SELECT COALESCE(SUM((doc->>'totalAmount')::BIGINT), 0)
          FROM documents
          WHERE collection = 5;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'get_category_product_count function',
      sql: `
        CREATE OR REPLACE FUNCTION get_category_product_count(p_category_num_id INTEGER)
        RETURNS BIGINT AS $$
          SELECT COUNT(*)::BIGINT
          FROM products
          WHERE category_num_id = p_category_num_id;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'get_subcategory_product_count function',
      sql: `
        CREATE OR REPLACE FUNCTION get_subcategory_product_count(p_subcategory_num_id INTEGER)
        RETURNS BIGINT AS $$
          SELECT COUNT(*)::BIGINT
          FROM products
          WHERE subcategory_num_id = p_subcategory_num_id;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'get_order_count_by_status function',
      sql: `
        CREATE OR REPLACE FUNCTION get_order_count_by_status(p_status TEXT)
        RETURNS BIGINT AS $$
          SELECT COUNT(*)::BIGINT
          FROM documents
          WHERE collection = 5 AND (doc->>'status') = p_status;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'get_recent_order_count function',
      sql: `
        CREATE OR REPLACE FUNCTION get_recent_order_count(p_days INTEGER)
        RETURNS BIGINT AS $$
          SELECT COUNT(*)::BIGINT
          FROM documents
          WHERE collection = 5 
            AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    }
  ];

  // Use sql() method instead of rpc()
  for (const step of steps) {
    try {
      console.log(`Executing: ${step.name}...`);
      const { data, error } = await supabase.sql(step.sql);

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