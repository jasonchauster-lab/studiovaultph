
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPC() {
    const { data, error } = await supabase.rpc('process_booking_completion_atomic', { target_booking_id: '00000000-0000-0000-0000-000000000000' });

    if (error) {
        console.log("RPC Error:", error.message);
    } else {
        console.log("RPC exists, result:", data);
    }
}

checkRPC();
