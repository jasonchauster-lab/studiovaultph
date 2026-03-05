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

async function findRecursivePolicies() {
    console.log('--- SEARCHING FOR RECURSIVE POLICIES MENTIONING "profiles" ---');

    const { data: policies, error } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT 
                tablename, 
                policyname, 
                qual, 
                with_check 
            FROM pg_policies 
            WHERE 
                (qual ILIKE '%profiles%' OR with_check ILIKE '%profiles%')
                AND tablename != 'profiles' -- Exclude profiles table's own policies for now, though we should check them too
            ORDER BY tablename
        `
    });

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`Found ${policies.length} suspect policies.`);
    policies.forEach(p => {
        console.log(`\nTable: ${p.tablename} | Policy: ${p.policyname}`);
        console.log(`  QUAL: ${p.qual}`);
        if (p.with_check) console.log(`  WITH CHECK: ${p.with_check}`);
    });
}

findRecursivePolicies();
