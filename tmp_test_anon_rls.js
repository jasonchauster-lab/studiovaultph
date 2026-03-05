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
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAnonRLS() {
    console.log('--- TESTING ANON RLS (PROFILES) ---');
    const start = Date.now();
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000));

    try {
        console.log('Attempting to fetch 1 row from profiles as anon...');
        const { data, error } = await Promise.race([
            supabase.from('profiles').select('id').limit(1),
            timeout
        ]);

        const duration = Date.now() - start;
        if (error) {
            console.log(`Result: Error (${error.message}) in ${duration}ms`);
        } else {
            console.log(`Result: Success (${data?.length || 0} rows) in ${duration}ms`);
        }
    } catch (e) {
        console.error(`Result: HANG or TIMEOUT after ${Date.now() - start}ms: ${e.message}`);
    }
}

testAnonRLS();
