
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

async function checkQuery() {
    console.log('--- Testing Studio Dashboard Query ---');

    const slotId = '33149f24-fbd2-42db-8cea-f9b839b97b25'; // March 8 slot

    const { data: slots, error } = await supabase
        .from('slots')
        .select(`
            *,
            bookings (
                id,
                status,
                equipment:price_breakdown->>'equipment'
            )
        `)
        .eq('id', slotId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (slots && slots.length > 0) {
        const s = slots[0];
        console.log(`Slot ID: ${s.id}`);
        console.log(`Slot Equipment: ${JSON.stringify(s.equipment)}`);
        console.log(`Bookings Count: ${s.bookings?.length}`);
        if (s.bookings && s.bookings.length > 0) {
            console.log(`First Booking: ${JSON.stringify(s.bookings[0])}`);
            console.log(`First Booking Equipment (Extracted): ${s.bookings[0].equipment}`);
        }
    } else {
        console.log('Slot not found.');
    }
}

checkQuery();
