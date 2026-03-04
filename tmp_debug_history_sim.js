const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateHistoryPage() {
    const ownerId = '909c5932-4410-415e-8743-26d5f3b4d8d4'; // For Clubpilates PH

    console.log('--- Simulating history/page.tsx ---');

    // 1. Get Studio ID
    const { data: studio, error: studioError } = await supabase
        .from('studios')
        .select('id')
        .eq('owner_id', ownerId)
        .single();

    if (studioError) {
        console.error('Step 1 Error:', studioError);
        return;
    }
    console.log('Step 1: Studio found:', studio.id);

    // 2. Get all slot IDs
    const { data: studioSlots, error: slotsError } = await supabase
        .from('slots')
        .select('id')
        .eq('studio_id', studio.id);

    if (slotsError) {
        console.error('Step 2 Error:', slotsError);
        return;
    }

    const slotIds = studioSlots?.map(s => s.id) ?? [];
    console.log(`Step 2: Found ${slotIds.length} slots.`);

    // 3. Fetch bookings
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slots (
                date,
                start_time,
                end_time,
                equipment,
                studios (
                    id,
                    name,
                    location,
                    address,
                    owner_id,
                    logo_url
                )
            ),
            instructor:profiles!instructor_id (
                id,
                full_name,
                avatar_url
            ),
            client:profiles!client_id (
                id,
                full_name,
                avatar_url
            )
        `)
        .in('slot_id', slotIds)
        .in('status', ['approved', 'completed', 'cancelled_refunded', 'cancelled_charged'])
        .order('created_at', { ascending: false });

    if (bookingsError) {
        console.error('Step 3 Error:', bookingsError);
        return;
    }

    console.log(`Step 3: Found ${bookings ? bookings.length : 0} bookings.`);

    if (bookings && bookings.length > 0) {
        console.log('First booking structure:', JSON.stringify(bookings[0], null, 2));
    } else {
        console.log('No bookings found in Step 3.');

        // Debug: check for ANY bookings for these slots regardless of status
        const { data: allBookings } = await supabase
            .from('bookings')
            .select('status')
            .in('slot_id', slotIds);
        console.log('All booking statuses for these slots:', allBookings?.map(b => b.status));
    }
}

simulateHistoryPage();
