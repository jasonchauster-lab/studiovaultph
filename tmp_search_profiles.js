const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchProfiles() {
    console.log('--- Searching for profiles ---');

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or('full_name.ilike.%tracy%,full_name.ilike.%meck%,email.ilike.%tracy%,email.ilike.%meck%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Results:', profiles);

    if (profiles) {
        for (const p of profiles) {
            const { data: b } = await supabase.from('bookings').select('id, status').eq('client_id', p.id);
            console.log(`Bookings as client for ${p.full_name} (${p.id}):`, b);

            const { data: b2 } = await supabase.from('bookings').select('id, status').eq('instructor_id', p.id);
            console.log(`Bookings as instructor for ${p.full_name} (${p.id}):`, b2);
        }
    }
}

searchProfiles();
