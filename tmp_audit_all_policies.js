const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.join('=').trim();
        }
    });
    return env;
}

const env = getEnv();
const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function listAllPolicies() {
    console.log('--- COMPREHENSIVE RLS POLICY AUDIT ---');

    // Query pg_policies directly
    const { data: policies, error } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT 
                schemaname, 
                tablename, 
                policyname, 
                permissive, 
                roles, 
                cmd, 
                qual, 
                with_check 
            FROM pg_policies 
            WHERE schemaname IN ('public', 'storage')
            ORDER BY tablename, cmd
        `
    });

    if (error) {
        console.error('Error fetching policies (check if exec_sql exists):', error.message);
        return;
    }

    console.log(`Found ${policies.length} policies.`);

    // Group by table for readability
    const grouped = {};
    policies.forEach(p => {
        if (!grouped[p.tablename]) grouped[p.tablename] = [];
        grouped[p.tablename].push(p);
    });

    for (const [table, TablePolicies] of Object.entries(grouped)) {
        console.log(`\nTable: ${table}`);
        TablePolicies.forEach(p => {
            console.log(`  - [${p.cmd}] ${p.policyname}`);
            console.log(`    QUAL: ${p.qual}`);
            if (p.with_check) console.log(`    WITH CHECK: ${p.with_check}`);
        });
    }
}

listAllPolicies();
