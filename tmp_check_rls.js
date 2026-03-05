const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic env loading since dotenv might not be available
const envPath = 'c:/Users/jason/Downloads/pilatesBridgeWebsite/.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLS() {
    const tablesToCheck = [
        'profiles',
        'studios',
        'slots',
        'instructor_availability',
        'certifications',
        'bookings',
        'payout_requests',
        'wallet_top_ups'
    ];

    console.log('--- RLS Status Check ---');

    // Check if we can access tables as anon
    const anonClient = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    for (const table of tablesToCheck) {
        try {
            const { data, error } = await anonClient.from(table).select('*').limit(1);
            if (!error) {
                console.log(`[WARNING] Table "${table}" is READABLE by ANON! (RLS potentially disabled or set to public)`);
            } else if (error.code === '42P01') {
                console.log(`[INFO] Table "${table}" does not exist.`);
            } else if (error.message.includes('permission denied')) {
                console.log(`[OK] Table "${table}" blocked for ANON: ${error.message}`);
            } else {
                console.log(`[?] Table "${table}" returned error: ${error.message} (Code: ${error.code})`);
            }
        } catch (e) {
            console.log(`[ERROR] querying ${table}:`, e.message);
        }
    }
}

checkRLS();
