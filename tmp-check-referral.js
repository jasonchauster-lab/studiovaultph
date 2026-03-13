
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReferrals() {
    console.log('Checking absolute latest 5 profiles:');
    const { data: latest, error: lError } = await supabase
        .from('profiles')
        .select('id, full_name, email, referred_by, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (lError) console.error(lError);
    else console.table(latest);

    console.log('\nChecking for ANY profiles with a referral:');
    const { data: referred, error: rError } = await supabase
        .from('profiles')
        .select('id, full_name, email, referred_by, created_at')
        .not('referred_by', 'is', null);

    if (rError) console.error(rError);
    else {
        console.log(`Total profiles with referred_by: ${referred.length}`);
        if (referred.length > 0) console.table(referred);
    }

    console.log('\nChecking for any referral codes that might have been used:');
    const { data: codes } = await supabase
        .from('profiles')
        .select('id, email, referral_code')
        .not('referral_code', 'is', null)
        .limit(10);
    console.table(codes);
}

checkReferrals();
