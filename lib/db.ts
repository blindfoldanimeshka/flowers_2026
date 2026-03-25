import { SUPABASE_COLLECTION_TABLE, supabase, supabaseKey, supabaseUrl } from '@/lib/supabase';

declare global {
  // eslint-disable-next-line no-var
  var supabaseConnectionChecked: boolean | undefined;
}

async function connect() {
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is not configured');
  }
  if (!supabaseKey) {
    throw new Error(
      'Supabase key is not configured. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).'
    );
  }

  if (global.supabaseConnectionChecked) {
    return true;
  }

  const { error } = await supabase
    .from(SUPABASE_COLLECTION_TABLE)
    .select('id,collection,doc')
    .limit(1);

  if (error) {
    if (error.message.includes('schema cache') || error.message.includes('column')) {
      throw new Error(
        `Supabase table "${SUPABASE_COLLECTION_TABLE}" has invalid schema. Expected columns: id, collection, doc, created_at, updated_at. Run scripts/supabase-init.sql in Supabase SQL Editor.`
      );
    }
    throw new Error(`Supabase connection failed: ${error.message}`);
  }

  global.supabaseConnectionChecked = true;
  return true;
}

export default connect;
