const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRejectedBookings() {
    console.log('--- Checking Rejected/Expired Bookings for Studio ---');

    const studioId = 'e6a2d39e-b888-4b84-9c6d-5711a62c9920';

    const { data: slots } = await supabase.from('slots').select('id').eq('studio_id', studioId);
    const slotIds = slots.map(s => s.id);

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            client_id,
            instructor_id,
            client:profiles!client_id(full_name, email),
            instructor:profiles!instructor_id(full_name, email)
        `)
        .in('slot_id', slotIds)
        .in('status', ['rejected', 'expired']);

    if (error) {
        console.error(error);
        return;
    }

    for (const b of bookings) {
        console.log(`Booking ${b.id} (${b.status}):`);
        console.log(`  Client: ${b.client?.full_name} (${b.client?.email})`);
        console.log(`  Instructor: ${b.instructor?.full_name} (${b.instructor?.email})`);
    }
}

checkRejectedBookings();
