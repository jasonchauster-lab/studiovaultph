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
    console.log('--- Testing "pending" status ---');
    const res = await fetch(`${supabaseUrl}/rest/v1/bookings?status=eq.pending&limit=1`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });

    if (res.ok) {
        console.log('"pending" seems VALID (status 200)');
    } else {
        const error = await res.json();
        console.log('"pending" seems INVALID:', error.message);
    }
}

run().catch(console.error);
