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
// We use the service role but we'll try to simulate the RLS by NOT using it 
// or by explicitly checking the RLS-enabled queries.
const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function timedQuery(name, queryPromise) {
    const start = Date.now();
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000));
    try {
        const { data, error } = await Promise.race([queryPromise, timeout]);
        const duration = Date.now() - start;
        if (error) {
            console.error(`❌ ${name} failed after ${duration}ms: ${error.message}`);
        } else {
            console.log(`✅ ${name} succeeded after ${duration}ms. Rows: ${data?.length ?? (data ? 1 : 0)}`);
        }
    } catch (e) {
        console.error(`❌ ${name} HANGED or FAILED after ${Date.now() - start}ms: ${e.message}`);
    }
}

async function diagnosticRun() {
    console.log('--- ADMIN DASHBOARD QUERY DIAGNOSTICS ---');

    // These represent the parallel queries in AdminDashboard page.tsx
    await Promise.all([
        timedQuery('Certifications', supabase.from('certifications').select('*, profiles(full_name)').eq('verified', false)),
        timedQuery('Studios', supabase.from('studios').select('*, profiles(full_name)').eq('verified', false)),
        timedQuery('Bookings', supabase.from('bookings').select('*, client:profiles!client_id(full_name)').eq('status', 'pending')),
        timedQuery('Payout Requests', supabase.from('payout_requests').select('*').eq('status', 'pending')),
        timedQuery('Wallet Top-ups', supabase.from('wallet_top_ups').select('*').eq('status', 'pending')),
        timedQuery('Admin Activity Logs', supabase.from('admin_activity_logs').select('*, admin:profiles!admin_id(full_name)')),
        timedQuery('All Users (Admin Client)', supabase.from('profiles').select('*'))
    ]);
}

diagnosticRun();
