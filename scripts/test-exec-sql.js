const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.trim().startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing exec_sql...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1 as test' });
    if (error) {
        console.error('Error calling exec_sql:', error);
    } else {
        console.log('Success:', data);
    }
}

test();
