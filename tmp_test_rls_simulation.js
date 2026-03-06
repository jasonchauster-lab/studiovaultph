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

// Admin UID for jasonchauster@gmail.com
const ADMIN_UID = '7669d031-64d1-441a-a0f1-0bc4b333241b';

async function testAsAdmin() {
    console.log(`--- SIMULATING DASHBOARD SELECT AS ADMIN (${ADMIN_UID}) ---`);

    // We use exec_sql to run the query in a transaction where we mock the auth role
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT 
                set_config('request.jwt.claims', '${JSON.stringify({ sub: ADMIN_UID, role: 'authenticated' })}', true),
                (SELECT count(*) FROM public.bookings) as booking_count;
        `
    });

    if (error) {
        console.error('Query Failed:', error.message);
    } else {
        console.log('Query Succeeded:', data);
    }
}

testAsAdmin();
