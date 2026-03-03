
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = '909c5932-4410-415e-8743-26d5f3b4d8d4';

async function testRPC() {
    console.log(`--- Testing RPC: execute_admin_balance_adjustment ---`);

    // 1. Get current balance
    const { data: before } = await supabase.from('profiles').select('available_balance').eq('id', userId).single();
    console.log(`Balance BEFORE RPC: ${before.available_balance}`);

    // 2. Call RPC (+10 test)
    console.log('Calling RPC with +10...');
    const { data: success, error } = await supabase.rpc('execute_admin_balance_adjustment', {
        p_user_id: userId,
        p_amount: 10,
        p_reason: 'TEST: RPC verification'
    });

    if (error) {
        console.error('RPC Error:', error);
    } else {
        console.log(`RPC Success: ${success}`);
    }

    // 3. Get balance AFTER
    const { data: after } = await supabase.from('profiles').select('available_balance').eq('id', userId).single();
    console.log(`Balance AFTER RPC:  ${after.available_balance}`);

    if (Number(after.available_balance) === Number(before.available_balance) + 10) {
        console.log('✅ RPC is working correctly.');
    } else {
        console.log('❌ RPC FAILED to update the profile balance!');
    }

    // Cleanup: deduct 10 if it worked
    if (Number(after.available_balance) === Number(before.available_balance) + 10) {
        await supabase.rpc('execute_admin_balance_adjustment', {
            p_user_id: userId,
            p_amount: -10,
            p_reason: 'TEST: RPC cleanup'
        });
    }
}

testRPC();
