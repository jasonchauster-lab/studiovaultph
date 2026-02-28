const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
    if (!supabaseKey && line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

async function run() {
    console.log('--- Fetching booking_status enum values ---');
    // We can query the information_schema via RPC or just try known ones.
    // A better way is to use a dummy query that forced an error with a list of values.
    // Or just try specific ones.
    const statuses = ['pending', 'approved', 'submitted', 'paid', 'confirmed', 'rejected', 'cancelled', 'expired'];
    for (const s of statuses) {
        const res = await fetch(`${supabaseUrl}/rest/v1/bookings?status=eq.${s}&limit=1`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        if (res.ok) {
            console.log(`[VALID] ${s}`);
        } else {
            const err = await res.json();
            console.log(`[INVALID] ${s} - ${err.message}`);
        }
    }
}

run().catch(console.error);
