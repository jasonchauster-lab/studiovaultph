const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJChau() {
    const id = '87cf6e4d-9057-431d-9db4-7c458c8728cb'; // jchau199@gmail.com
    console.log(`Checking Client ID: ${id}`);

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, status, created_at')
        .eq('client_id', id);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${bookings.length} bookings as client:`, bookings);
}

checkJChau();
