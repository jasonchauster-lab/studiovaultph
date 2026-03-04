
const { createClient } = require('@supabase/supabase-js');

async function debug() {
    const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const bookingId = 'ccbae241-0394-4d25-ab20-1903bd608c52';

    const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    console.log('Rejected Booking Details:', booking);
}

debug();
