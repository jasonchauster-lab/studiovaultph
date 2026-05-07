const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function listTables() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
        }
    });

    const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase.rpc('get_tables'); // If rpc exists
    
    // Alternative: query a common table
    const { data: tables, error: tableError } = await supabase.from('profiles').select('*').limit(1);
    
    // I'll just use a direct SQL query via a hacky way if I can, but Supabase JS doesn't support raw SQL.
    // I'll check if 'customer_memberships' exists by trying to select from it.
    const { error: checkError } = await supabase.from('customer_memberships').select('count').limit(1);
    console.log(`Check customer_memberships: ${checkError ? checkError.message : 'Exists'}`);
    
    const { error: checkError2 } = await supabase.from('studio_customers').select('count').limit(1);
    console.log(`Check studio_customers: ${checkError2 ? checkError2.message : 'Exists'}`);
}

listTables();
