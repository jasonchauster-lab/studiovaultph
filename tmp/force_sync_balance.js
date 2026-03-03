
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = '909c5932-4410-415e-8743-26d5f3b4d8d4';
const targetBalance = 500.00;

async function forceSync() {
    console.log(`--- Force Syncing Profile Balance for ${userId} to ${targetBalance} ---`);

    const { data: before } = await supabase.from('profiles').select('available_balance, wallet_balance').eq('id', userId).single();
    console.log(`Current Available: ${before.available_balance}`);
    console.log(`Current Wallet:    ${before.wallet_balance}`);

    const { error } = await supabase
        .from('profiles')
        .update({
            available_balance: targetBalance,
            wallet_balance: targetBalance,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);

    if (error) {
        console.error('Update Error:', error);
    } else {
        console.log('✅ Balance synchronized successfully.');
    }

    const { data: after } = await supabase.from('profiles').select('available_balance, wallet_balance').eq('id', userId).single();
    console.log(`New Available: ${after.available_balance}`);
    console.log(`New Wallet:    ${after.wallet_balance}`);
}

forceSync();
