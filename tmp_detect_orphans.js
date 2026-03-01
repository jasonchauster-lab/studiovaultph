const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Orphaned Slots Detection ---');

    const { data: unavailableSlots, error: slotError } = await supabase
        .from('slots')
        .select('id, start_time, equipment')
        .eq('is_available', false);

    if (slotError) {
        console.error('Error fetching slots:', slotError);
        return;
    }

    console.log(`Found ${unavailableSlots.length} slots marked as unavailable.`);

    let orphans = [];
    for (const slot of unavailableSlots) {
        const { count, error: countError } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .or(`slot_id.eq.${slot.id},booked_slot_ids.cs.{${slot.id}}`)
            .in('status', ['pending', 'approved', 'confirmed', 'paid', 'admin_approved']);

        if (countError) {
            console.error(`Error checking bookings for slot ${slot.id}:`, countError);
            continue;
        }

        if (count === 0) {
            orphans.push(slot);
        }
    }

    console.log(`\nDetected ${orphans.length} orphaned slots (is_available=false but no active booking):`);
    orphans.forEach(o => {
        console.log(`- Slot ID: ${o.id}, Start: ${o.start_time}, Eq: ${o.equipment}`);
    });

    if (orphans.length > 0) {
        console.log('\nSuggested Fix: UPDATE slots SET is_available = true WHERE id IN (' + orphans.map(o => `'${o.id}'`).join(', ') + ');');
    }
}

run();
