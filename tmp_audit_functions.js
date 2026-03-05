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

async function auditFunctions() {
    console.log('--- AUDITING HELPER FUNCTIONS ---');

    const { data: functions, error } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT 
                p.proname as name,
                r.rolname as owner,
                pg_get_functiondef(p.oid) as definition
            FROM pg_proc p 
            JOIN pg_roles r ON p.proowner = r.oid
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'public' 
              AND (p.proname LIKE 'check_%' OR p.proname LIKE 'is_%')
        `
    });

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    functions.forEach(f => {
        console.log(`\nFunction: ${f.name}`);
        console.log(`  Owner: ${f.owner}`);
        const isSecurityDefiner = f.definition.includes('SECURITY DEFINER');
        console.log(`  Security Definer: ${isSecurityDefiner}`);
        if (!isSecurityDefiner) {
            console.log('  ⚠️ WARNING: Not SECURITY DEFINER! Potential recursion risk.');
        }
    });
}

auditFunctions();
