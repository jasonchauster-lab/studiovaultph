const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];

const supabase = createClient(url, key);

async function cleanup() {
    console.log('--- STARTING ORPHANED SLOT CLEANUP ---');

    // 1. Fetch all slots that are marked as unavailable
    const { data: slots, error: sError } = await supabase
        .from('slots')
        .select('id, date, start_time, is_available, quantity, equipment')
        .eq('is_available', false);

    if (sError) {
        console.error('Error fetching slots:', sError);
        return;
    }

    console.log(`Analyzing ${slots.length} unavailable slots...`);

    // 2. Fetch all bookings to cross-reference
    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select('id, slot_id, booked_slot_ids');

    if (bError) {
        console.error('Error fetching bookings:', bError);
        return;
    }

    const linkedSlotIds = new Set();
    bookings.forEach(b => {
        if (b.slot_id) linkedSlotIds.add(b.slot_id);
        if (b.booked_slot_ids && Array.isArray(b.booked_slot_ids)) {
            b.booked_slot_ids.forEach(id => linkedSlotIds.add(id));
        }
    });

    // 3. Identify orphans
    const orphansToDelete = [];
    slots.forEach(s => {
        if (!linkedSlotIds.has(s.id)) {
            // An unavailable slot with NO booking is an orphan.
            // Extra safety: if it's a parent that still has quantity but is marked false, we should fix it to true.
            // But for now, let's focus on the dead ones (quantity 0 or empty equipment).
            const isDead = s.quantity <= 0 || !s.equipment || Object.keys(s.equipment).length === 0 || Object.values(s.equipment).every(v => v === 0);

            if (isDead) {
                orphansToDelete.push(s.id);
            }
        }
    });

    console.log(`Found ${orphansToDelete.length} dead orphaned slots to delete.`);

    if (orphansToDelete.length > 0) {
        // Delete in batches of 50
        for (let i = 0; i < orphansToDelete.length; i += 50) {
            const batch = orphansToDelete.slice(i, i + 50);
            const { error: dError } = await supabase
                .from('slots')
                .delete()
                .in('id', batch);

            if (dError) {
                console.error(`Error deleting batch ${i}:`, dError);
            } else {
                console.log(`Deleted batch ${i / 50 + 1}`);
            }
        }
    }

    console.log('--- CLEANUP COMPLETE ---');
}

cleanup();
