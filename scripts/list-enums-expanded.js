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
    const statuses = ['pending', 'approved', 'rejected', 'expired', 'completed', 'cancelled', 'cancelled_refunded', 'cancelled_charged', 'paid', 'confirmed', 'admin_approved', 'processed'];
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
