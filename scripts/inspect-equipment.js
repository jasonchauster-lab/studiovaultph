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
    console.log('--- Inspecting Slots with Equipment ---');
    const resSlots = await fetch(`${supabaseUrl}/rest/v1/slots?select=id,equipment,is_available,start_time&limit=20`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const slots = await resSlots.json();
    console.log('Slots Sample:', JSON.stringify(slots, null, 2));

    console.log('\n--- Inspecting Recent Bookings with Slots ---');
    const resBookings = await fetch(`${supabaseUrl}/rest/v1/bookings?select=id,status,instructor_id,slot_id,slots(id,start_time,equipment)&order=created_at.desc&limit=5`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const bookings = await resBookings.json();
    console.log('Recent Bookings:', JSON.stringify(bookings, null, 2));
}

run().catch(console.error);
