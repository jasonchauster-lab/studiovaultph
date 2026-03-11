const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://wzacmyemiljzpdskyvie.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
async function run() {
    const { data, error } = await supabase.from('bookings').select('*').limit(1);
    if (error) console.error(error);
    else if (data && data.length > 0) console.log(Object.keys(data[0]));
    else console.log('No bookings found');
}
run();
