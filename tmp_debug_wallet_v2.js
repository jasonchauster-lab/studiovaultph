
const { createClient } = require('@supabase/supabase-js');

async function debug() {
    const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userId = '87cf6e4d-9057-431d-9db4-7c458c8728cb';

    // 1. All records in wallet_top_ups
    const { data: topUps, error: tError } = await supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('user_id', userId);

    console.log('--- wallet_top_ups ---');
    if (tError) console.error('tError:', tError);
    else console.log('Count:', topUps.length, topUps);

    // 2. All records in payout_requests
    const { data: payouts, error: pError } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', userId);

    console.log('--- payout_requests ---');
    if (pError) console.error('pError:', pError);
    else console.log('Count:', payouts.length, payouts);

    // 3. Bookings with wallet deduction
    const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, price_breakdown, created_at')
        .eq('client_id', userId);

    console.log('--- bookings with wallet ---');
    const walletBookings = bookings?.filter(b => b.price_breakdown?.wallet_deduction > 0);
    console.log('Count:', walletBookings?.length, walletBookings);
}

debug();
