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
    console.log('--- Random Slot Dump ---');
    const resSlots = await fetch(`${supabaseUrl}/rest/v1/slots?select=id,start_time&limit=3`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const slots = await resSlots.json();
    console.log('Slots:', JSON.stringify(slots, null, 2));

    console.log('\n--- Random Booking Dump ---');
    const resBookings = await fetch(`${supabaseUrl}/rest/v1/bookings?select=id,status,instructor_id,slots(id,start_time)&limit=3`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const bookings = await resBookings.json();
    console.log('Bookings:', JSON.stringify(bookings, null, 2));
}

run().catch(console.error);
