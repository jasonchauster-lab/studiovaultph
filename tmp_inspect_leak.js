const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = 'c:/Users/jason/Downloads/pilatesBridgeWebsite/.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.join('=').trim();
    }
});

const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspectDataLeak() {
    console.log('--- Inspecting Profile Data Leak (ANON) ---');
    const { data: profiles, error: pError } = await anonClient.from('profiles').select('*').limit(3);
    if (!pError) {
        console.log('Sample Profiles Leaked:', JSON.stringify(profiles, null, 2));
    } else {
        console.log('Error fetching profiles:', pError.message);
    }

    console.log('\n--- Inspecting Booking Data Leak (ANON) ---');
    const { data: bookings, error: bError } = await anonClient.from('bookings').select('*').limit(3);
    if (!bError) {
        console.log('Sample Bookings Leaked:', JSON.stringify(bookings, null, 2));
    } else {
        console.log('Error fetching bookings:', bError.message);
    }
}

inspectDataLeak();
