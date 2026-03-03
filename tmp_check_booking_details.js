
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

async function checkBookingDetails() {
    console.log('--- Checking Booking Price Breakdown and Slot Equipment ---');

    const bookingIds = ['9012dd00-588a-425c-bb59-b0f984865747', '3cc7d783-b63a-4b35-8530-b8a14dd12331'];

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id, status, price_breakdown, slot_id,
            slots (
                id, equipment, date, start_time
            )
        `)
        .in('id', bookingIds);

    if (error) {
        console.error('Error:', error);
        return;
    }

    bookings.forEach(b => {
        console.log(`\nBooking ID: ${b.id}`);
        console.log(`Status: ${b.status}`);
        console.log(`Price Breakdown: ${JSON.stringify(b.price_breakdown)}`);
        console.log(`Equipment from breakdown: ${b.price_breakdown?.equipment}`);
        if (b.slots) {
            console.log(`Slot ID: ${b.slots.id}`);
            console.log(`Slot Equipment Keys: ${Object.keys(b.slots.equipment || {})}`);
            console.log(`Slot Equipment Content: ${JSON.stringify(b.slots.equipment)}`);
        }
    });
}

checkBookingDetails();
