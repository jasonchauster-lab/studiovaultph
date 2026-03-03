const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentBookings() {
    console.log('Fetching recent bookings...');
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            equipment,
            quantity,
            slot_id,
            booked_slot_ids,
            created_at,
            slots (
                id,
                equipment,
                equipment_inventory,
                quantity,
                is_available,
                created_at
            )
        `)
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(JSON.stringify(bookings, null, 2));

    // Also get the parent slots if we can figure out which ones they were extracted from.
    // The only way to know is to look at slots at the same time and studio.
    if (bookings.length > 0) {
        const slot = bookings[0].slots;
        if (slot) {
            const { data: originalSlots } = await supabase.from('slots')
                .select('id, equipment, equipment_inventory, is_available')
                .eq('created_at', slot.created_at) // Might not be exact, just get some recent slots
                .order('created_at', { ascending: false })
                .limit(2);
            console.log("\nSome Recent Slots:", JSON.stringify(originalSlots, null, 2));
        }
    }
}

checkRecentBookings();
