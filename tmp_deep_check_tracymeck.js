const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepCheck() {
    const id = 'f88938fc-eaa0-491a-8283-2972da96e24b';
    console.log(`Checking ID: ${id}`);

    // Check as client
    const { data: clientBookings } = await supabase.from('bookings').select('id, status, created_at').eq('client_id', id);
    console.log('As client:', clientBookings);

    // Check as instructor
    const { data: instructorBookings } = await supabase.from('bookings').select('id, status, created_at').eq('instructor_id', id);
    console.log('As instructor:', instructorBookings);

    // Let's also search for all profiles with name containing "tracy"
    const { data: tracyProfiles } = await supabase.from('profiles').select('id, full_name, email').ilike('full_name', '%tracy%');
    console.log('Tracy profiles:', tracyProfiles);

    // And check if there are any bookings for those profiles
    if (tracyProfiles) {
        for (const p of tracyProfiles) {
            const { data: b } = await supabase.from('bookings').select('id, status').eq('client_id', p.id);
            console.log(`Bookings for ${p.full_name} (${p.id}):`, b);
        }
    }
}

deepCheck();
