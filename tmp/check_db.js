const fs = require('fs');

// Read .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    let [key, ...valueParts] = line.split('=');
    let value = valueParts.join('=').trim();
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value;
    if (!supabaseKey && key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseKey = value;
});

async function run() {
    console.log('--- DB COUNTS ---');

    const tables = ['bookings', 'slots', 'profiles', 'studios'];
    for (const table of tables) {
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=count`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'count=exact'
            }
        });
        const count = res.headers.get('content-range')?.split('/')[1];
        console.log(`${table}: ${count}`);
    }

    console.log('\n--- ALL BOOKINGS ---');
    const resBookings = await fetch(`${supabaseUrl}/rest/v1/bookings?select=*`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const bookings = await resBookings.json();
    console.log(JSON.stringify(bookings, null, 2));

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
