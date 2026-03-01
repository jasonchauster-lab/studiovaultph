const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=').slice(1).join('=').trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=').slice(1).join('=').trim();
    if (!supabaseKey && line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=').slice(1).join('=').trim();
});

async function query(sql) {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/debug_sql`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql })
    });
    return res.json();
}

async function run() {
    console.log('--- Checking Bookings ---');

    // 1. Check all bookings
    const res1 = await fetch(`${supabaseUrl}/rest/v1/bookings?select=id,status,slot_id&limit=5`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const bookings = await res1.json();
    console.log('Bookings (service role):', JSON.stringify(bookings, null, 2));

    // 2. Check studios
    const res2 = await fetch(`${supabaseUrl}/rest/v1/studios?select=id,name&limit=3`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const studios = await res2.json();
    console.log('\nStudios:', JSON.stringify(studios, null, 2));

    if (!studios || studios.length === 0) {
        console.log('No studios found!');
        return;
    }

    const studioId = studios[0].id;
    console.log('\nUsing studio ID:', studioId);

    // 3. Get slots for this studio
    const res3 = await fetch(`${supabaseUrl}/rest/v1/slots?studio_id=eq.${studioId}&select=id&limit=5`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const slots = await res3.json();
    console.log('\nSlots for studio:', JSON.stringify(slots, null, 2));

    if (!slots || slots.length === 0) {
        console.log('No slots found for this studio!');
        return;
    }

    // 4. Try getting bookings via slot_id (the approach admin uses)
    const slotIds = slots.map(s => s.id);
    const inFilter = slotIds.map(id => `slot_id=eq.${id}`).join(' or ');
    const res4 = await fetch(`${supabaseUrl}/rest/v1/bookings?or=(${encodeURIComponent(inFilter)})&select=id,status,slot_id&limit=10`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const b2 = await res4.json();
    console.log('\nBookings via slot_ids:', JSON.stringify(b2, null, 2));

    // 5. Try the inner join approach
    const res5 = await fetch(`${supabaseUrl}/rest/v1/bookings?select=id,status,slot_id,slots!inner(studio_id)&slots.studio_id=eq.${studioId}&limit=10`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const b3 = await res5.json();
    console.log('\nBookings via inner join filter:', JSON.stringify(b3, null, 2));
}

run().catch(console.error);
