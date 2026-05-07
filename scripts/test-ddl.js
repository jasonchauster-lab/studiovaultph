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

async function testDDL() {
    console.log('Testing DDL through exec_sql...');
    // Try to create a dummy function
    const sql = `
    CREATE OR REPLACE FUNCTION test_ddl_func() 
    RETURNS text AS $$ BEGIN RETURN 'DDL Works'; END; $$ 
    LANGUAGE plpgsql;
    SELECT 'Success' as status;
    `;
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error('Error calling exec_sql with DDL:', error);
    } else {
        console.log('Success:', data);
    }
}

testDDL();
