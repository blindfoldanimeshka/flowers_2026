const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

console.log('Raw env content:');
console.log(envContent.substring(0, 500));

const envVars = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.substring(0, idx).trim();
    const value = line.substring(idx + 1).trim();
    envVars[key] = value;
  }
});

console.log('\nParsed keys:', Object.keys(envVars));
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', 'SUPABASE_SERVICE_ROLE_KEY' in envVars);
console.log('SUPABASE_SERVICE_ROLE_KEY value:', envVars.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing config');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function debug() {
  const { data: users, error } = await supabase
    .from('documents')
    .select('id, doc')
    .eq('collection', 1);

  console.log('\nCollection 1 (users):', users);
  console.log('Error:', error);

  const { data: all } = await supabase.from('documents').select('id, collection, doc').limit(5);
  console.log('\nAll docs (sample):', all);
}

debug();