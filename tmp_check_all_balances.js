
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllBalances() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('full_name, available_balance, pending_balance')
        .or('available_balance.gt.0,pending_balance.gt.0');

    if (error) {
        console.error("Error checking balance:", error);
    } else {
        console.log("Profiles with balances:", profiles);
    }
}

checkAllBalances();
