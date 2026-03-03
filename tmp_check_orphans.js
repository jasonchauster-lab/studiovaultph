
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrphanBookings() {
    const instructorId = 'f88938fc-eaa0-491a-8283-2972da96e24b';

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id, 
            slot_id,
            status, 
            price_breakdown
        `)
        .eq('instructor_id', instructorId);

    if (error) {
        console.error("Error:", error);
    } else {
        for (const b of bookings) {
            const { data: slot } = await supabase.from('slots').select('*').eq('id', b.slot_id).single();
            console.log(`Booking ${b.id}: slot_id ${b.slot_id}, slot exists: ${!!slot}`);
            if (slot) console.log(`  Slot Date: ${slot.date}, Start: ${slot.start_time}`);
        }
    }
}

checkOrphanBookings();
