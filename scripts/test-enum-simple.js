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
    console.log('--- Testing "confirmed" status ---');
    // Try to catch error on a dummy insert (don't actually insert, use a non-existent ID or just an invalid row)
    // Actually, safer to check the enum definition via SQL.
    // I will try to fetch with status=eq.confirmed. If it returns 400 with "invalid input value", it's invalid.
    const res = await fetch(`${supabaseUrl}/rest/v1/bookings?status=eq.confirmed&limit=1`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });

    if (res.ok) {
        console.log('"confirmed" seems VALID (status 200)');
    } else {
        const error = await res.json();
        console.log('"confirmed" seems INVALID:', error.message);
    }

    console.log('\n--- Testing "approved" status ---');
    const res2 = await fetch(`${supabaseUrl}/rest/v1/bookings?status=eq.approved&limit=1`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    if (res2.ok) {
        console.log('"approved" seems VALID (status 200)');
    } else {
        const error = await res2.json();
        console.log('"approved" seems INVALID:', error.message);
    }

    console.log('\n--- Testing "paid" status ---');
    const res3 = await fetch(`${supabaseUrl}/rest/v1/bookings?status=eq.paid&limit=1`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    if (res3.ok) {
        console.log('"paid" seems VALID (status 200)');
    } else {
        const error = await res3.json();
        console.log('"paid" seems INVALID:', error.message);
    }
}

run().catch(console.error);
