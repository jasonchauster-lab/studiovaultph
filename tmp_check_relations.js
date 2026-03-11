const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://wzacmyemiljzpdskyvie.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
async function run() {
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            client:profiles!bookings_user_id_fkey (full_name),
            instructor:profiles!bookings_instructor_id_fkey (full_name)
        `)
        .limit(1);

    if (error) {
        console.error('Fetch failed with specific FK names:', error.message);
        // Try other names
        const { data: b2, error: e2 } = await supabase
            .from('bookings')
            .select(`
                id,
                client:profiles!client_id (full_name),
                instructor:profiles!instructor_id (full_name)
            `)
            .limit(1);
        if (e2) console.error('Fetch failed with column name FK:', e2.message);
        else console.log('Fetch SUCCEEDED with client_id/instructor_id names:', b2[0]);
    } else {
        console.log('Fetch SUCCEEDED with bookings_user_id_fkey names:', bookings[0]);
    }
}
run();
