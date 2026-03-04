
const { createClient } = require('@supabase/supabase-js');

async function debug() {
    const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const email = 'jchau199@gmail.com';
    console.log('Searching for email:', email);

    // 1. Find the user ID
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);

    if (pError) {
        console.error('Profile Error:', pError);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('User profile not found for email:', email);
        return;
    }

    const user = profiles[0];
    console.log('User found:', { id: user.id, full_name: user.full_name, balance: user.available_balance });

    // 2. Check wallet_transactions
    const { data: transactions, error: tError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id);

    if (tError) {
        console.error('Transactions Error:', tError);
    } else {
        console.log('Total transactions found:', transactions.length);
        if (transactions.length > 0) {
            console.log('Transactions:', JSON.stringify(transactions, null, 2));
        }
    }

    // 3. Check bookings that might have involved wallet
    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select('*, slots(date, start_time)')
        .eq('client_id', user.id);

    if (bError) {
        console.error('Bookings Error:', bError);
    } else {
        console.log('Total bookings for this user:', bookings.length);
        const withWallet = bookings.filter(b => b.price_breakdown?.wallet_deduction > 0);
        console.log('Bookings with wallet deduction:', withWallet.length);
    }
}

debug();
