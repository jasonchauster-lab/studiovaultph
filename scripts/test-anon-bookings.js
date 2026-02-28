const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let anonKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) anonKey = line.split('=')[1].trim();
});

const emma_id = 'cbea2652-3da1-443b-821f-6147171e0c4b'; // From previous turn's Emma search

async function run() {
    console.log('--- Fetching Active Bookings for Emma (ANON) ---');
    const res = await fetch(`${supabaseUrl}/rest/v1/bookings?instructor_id=eq.${emma_id}&status=in.("pending","approved","submitted")&select=id,status,slots(start_time)`, {
        headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
    });
    const data = await res.json();
    console.log('Result:', JSON.stringify(data, null, 2));

    if (Array.isArray(data) && data.length === 0) {
        console.log('\nNO BOOKINGS FOUND. This confirms why the slot persists (Step 1 sees []).');
        console.log('This is likely due to RLS policies on the "bookings" table.');
    }
}

run().catch(console.error);
