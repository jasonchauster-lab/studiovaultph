
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPastBookings() {
    const instructorId = 'f88938fc-eaa0-491a-8283-2972da96e24b';
    const today = '2026-03-03';

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id, 
            status, 
            price_breakdown,
            slots(date, start_time)
        `)
        .eq('instructor_id', instructorId)
        .lt('slots.date', today);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Past Bookings:", bookings);
    }
}

checkPastBookings();
