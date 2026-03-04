
const { createClient } = require('@supabase/supabase-js');

async function debug() {
    const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Total top-ups
    const { count: tCount } = await supabase.from('wallet_top_ups').select('*', { count: 'exact', head: true });
    console.log('Total wallet_top_ups:', tCount);

    // 2. Sample of top-ups
    const { data: samples } = await supabase.from('wallet_top_ups').select('*').limit(5);
    console.log('Sample top-ups:', samples);

    // 3. Profiles with non-zero balance
    const { data: richProfiles } = await supabase.from('profiles').select('id, full_name, email, available_balance').gt('available_balance', 0).limit(5);
    console.log('Profiles with balance:', richProfiles);
}

debug();
