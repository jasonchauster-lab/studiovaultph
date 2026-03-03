
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = '909c5932-4410-415e-8743-26d5f3b4d8d4'; // Clubpilates PH owner

async function repairBalance() {
    console.log(`--- Repairing Balance for Clubpilates PH (${userId}) ---`);

    // 1. Get current balance
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('available_balance, full_name')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
    }

    const currentBalance = Number(profile.available_balance);
    console.log(`Current Balance for ${profile.full_name}: ${currentBalance}`);

    if (currentBalance >= 0) {
        console.log('Balance is already non-negative. No repair needed.');
        return;
    }

    const adjustmentAmount = Math.abs(currentBalance);
    console.log(`Applying adjustment of +${adjustmentAmount} to bring balance to 0.`);

    // 2. Call RPC to clear it
    const { data: success, error: rpcError } = await supabase.rpc('execute_admin_balance_adjustment', {
        p_amount: adjustmentAmount,
        p_reason: 'Repair: Clearing negative balance as requested by studio owner/admin to re-enable bookings.',
        p_user_id: userId
    });

    if (rpcError) {
        console.error('Error executing repair RPC:', rpcError);
        return;
    }

    if (success) {
        console.log('✅ Balance repair COMPLETED successfully.');

        // Final verify
        const { data: finalProfile } = await supabase
            .from('profiles')
            .select('available_balance, wallet_balance')
            .eq('id', userId)
            .single();
        console.log(`New Available Balance: ${finalProfile.available_balance}`);
        console.log(`New Wallet Balance: ${finalProfile.wallet_balance}`);
    } else {
        console.error('RPC returned failure.');
    }
}

repairBalance();
