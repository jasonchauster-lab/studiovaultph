const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://wzacmyemiljzpdskyvie.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
async function run() {
    const { data, error } = await supabase.rpc('get_table_constraints', { table_name: 'bookings' });
    if (error) {
        // Fallback: search for fkey names if RPC fails
        console.log('RPC failed, trying simple query');
        const { data: b, error: e } = await supabase.from('bookings').select(`
            id,
            client:profiles (*),
            instructor:profiles (*)
        `).limit(1);
        if (e) console.log('Simple query failed:', e.message);
        else console.log('Simple query succeeded with profiles');
    } else {
        console.log(data);
    }
}
run();
