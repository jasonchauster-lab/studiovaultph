const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];

const supabase = createClient(url, key);

const studioId = 'e6a2d39e-b888-4b84-9c6d-5711a62c9920';
const weekStart = '2026-03-02';
const weekEnd = '2026-03-08';

async function run() {
    console.log(`Searching for orphaned slots for Studio: ${studioId} between ${weekStart} and ${weekEnd}`);

    // 1. Get all unavailable slots for this week
    const { data: slots, error: sError } = await supabase
        .from('slots')
        .select('id, date, start_time, is_available, equipment')
        .eq('studio_id', studioId)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .eq('is_available', false);

    if (sError) {
        console.error('Error fetching slots:', sError);
        return;
    }

    const slotIds = slots.map(s => s.id);
    console.log(`Found ${slots.length} slots marked as is_available=false.`);

    // 2. Get all bookings for these slots
    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select('id, slot_id, status, booked_slot_ids')
        .or(`slot_id.in.(${slotIds.join(',')}),booked_slot_ids.cs.{${slotIds.join(',')}}`);

    if (bError) {
        // Fallback if the OR query is too complex
        console.log('Or query failed, trying simple slot_id check...');
        const { data: simpleBookings } = await supabase
            .from('bookings')
            .select('id, slot_id, status, booked_slot_ids')
            .in('slot_id', slotIds);

        processBookings(slots, simpleBookings || []);
    } else {
        processBookings(slots, bookings || []);
    }
}

function processBookings(slots, bookings) {
    console.log(`Found ${bookings.length} total bookings linked to these slots.`);

    const orphaned = [];
    slots.forEach(s => {
        // A slot is NOT orphaned if:
        // 1. It's the primary slot_id of a booking
        // 2. It's in the booked_slot_ids array of a booking
        const isLinkedAsPrimary = bookings.some(b => b.slot_id === s.id);
        const isLinkedInArray = bookings.some(b => b.booked_slot_ids && b.booked_slot_ids.includes(s.id));

        if (!isLinkedAsPrimary && !isLinkedInArray) {
            orphaned.push(s);
        }
    });

    console.log(`\n--- ORPHANED SLOTS (is_available=false but no booking) ---`);
    if (orphaned.length === 0) {
        console.log('No orphaned slots found in this range.');
    } else {
        console.table(orphaned.map(o => ({
            id: o.id.slice(0, 8),
            full_id: o.id,
            date: o.date,
            time: o.start_time,
            equipment: JSON.stringify(o.equipment)
        })));
        console.log(`Total Orphans: ${orphaned.length}`);
    }
}

run();
