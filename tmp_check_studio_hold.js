const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- CHECKING STUDIO & OWNER ---');
    // We can find the studio ID from the screenshot maybe? Or just look for studios with bookings.
    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            total_price,
            slot_id,
            slots (
                studio_id,
                date,
                start_time
            )
        `)
        .eq('status', 'approved')
        .limit(5);

    if (!bookings || bookings.length === 0) {
        console.log('No approved bookings found.');
        return;
    }

    const studioId = bookings[0].slots.studio_id;
    console.log(`Checking Studio ID: ${studioId}`);

    const { data: studio } = await supabase
        .from('studios')
        .select('owner_id, name')
        .eq('id', studioId)
        .single();

    if (!studio) {
        console.log('Studio not found.');
        return;
    }

    const ownerId = studio.owner_id;
    console.log(`Owner ID: ${ownerId} (${studio.name})`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('available_balance, pending_balance, full_name')
        .eq('id', ownerId)
        .single();

    console.log('--- BALANCES ---');
    console.log(`Owner: ${profile.full_name}`);
    console.log(`Available Balance: ${profile.available_balance}`);
    console.log(`Pending Balance: ${profile.pending_balance}`);

    console.log('--- BOOKINGS FOR THIS STUDIO ---');
    const { data: studioBookings } = await supabase
        .from('bookings')
        .select('id, status, total_price, created_at, slots(date)')
        .eq('slots.studio_id', studioId);

    studioBookings?.forEach(b => {
        console.log(`Booking ${b.id}: status=${b.status}, price=${b.total_price}, date=${b.slots?.date}`);
    });
}

run();
