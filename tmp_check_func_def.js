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

async function checkFunction() {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'is_admin'"
    });

    if (error) {
        console.error('Error (Maybe exec_sql missing):', error.message);
        // Fallback: Use a different method to check if the function is recursive
        // By trying to call it and seeing if it times out
    } else {
        console.log('Function Definition:', data[0].pg_get_functiondef);
    }
}

checkFunction();
