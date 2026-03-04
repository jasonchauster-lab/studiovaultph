const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudioHistory() {
    console.log('--- Diagnostic: Studio Rental History ---');

    // 1. Find the studio
    const { data: studio, error: studioError } = await supabase
        .from('studios')
        .select('*')
        .ilike('name', '%Clubpilates PH%')
        .single();

    if (studioError) {
        console.error('Error fetching studio:', studioError);
        return;
    }

    console.log('Studio found:', { id: studio.id, name: studio.name, owner_id: studio.owner_id });

    // 2. Get all slot IDs for this studio
    const { data: studioSlots, error: slotsError } = await supabase
        .from('slots')
        .select('id, date, start_time')
        .eq('studio_id', studio.id);

    if (slotsError) {
        console.error('Error fetching slots:', slotsError);
        return;
    }

    const slotIds = studioSlots?.map(s => s.id) ?? [];
    console.log(`Total slots found for studio: ${slotIds.length}`);

    if (slotIds.length === 0) {
        console.log('No slots found for this studio.');
        return;
    }

    // 3. Fetch bookings for these slots
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, slot_id, created_at')
        .in('slot_id', slotIds);

    if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return;
    }

    console.log(`Total bookings found for these slots: ${bookings?.length ?? 0}`);

    if (bookings && bookings.length > 0) {
        console.log('Sample Bookings Statuses:', [...new Set(bookings.map(b => b.status))]);

        // Count statuses
        const statusCounts = bookings.reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1;
            return acc;
        }, {});
        console.log('Status Counts:', statusCounts);

        // Check for specific statuses used in history
        const historyStatuses = ['approved', 'completed', 'cancelled', 'cancelled_refunded'];
        const inHistory = bookings.filter(b => historyStatuses.includes(b.status));
        console.log(`Bookings matching history statuses: ${inHistory.length}`);

        if (inHistory.length > 0) {
            console.log('Sample matching booking:', inHistory[0]);
        }
    } else {
        console.log('No bookings associated with these slots.');
    }
}

checkStudioHistory();
