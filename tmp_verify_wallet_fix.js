
const { createClient } = require('@supabase/supabase-js');

async function verify() {
    const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // We can't easily run the server action directly here because of 'use server' and env deps,
    // but we can simulate the logic I just added.

    const userId = '87cf6e4d-9057-431d-9db4-7c458c8728cb';

    // 1. Fetch wallet_top_ups
    const { data: walletActions } = await supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('user_id', userId);

    // 2. Fetch bookings
    const { data: walletBookings } = await supabase
        .from('bookings')
        .select(`
            id,
            created_at,
            status,
            price_breakdown,
            slots (
                date,
                start_time,
                studios (
                    name
                )
            )
        `)
        .eq('client_id', userId)
        .not('price_breakdown', 'is', null);

    const transactions = [];

    walletActions?.forEach(wa => {
        if (wa.status === 'approved' || wa.type === 'admin_adjustment' || wa.type === 'refund') {
            transactions.push({
                type: wa.type,
                amount: wa.amount,
                date: wa.created_at
            });
        }
    });

    walletBookings?.forEach(b => {
        const deduction = Number(b.price_breakdown?.wallet_deduction || 0);
        if (deduction > 0) {
            transactions.push({
                type: 'Booking Payment',
                amount: -deduction,
                date: b.created_at,
                studio: (Array.isArray(b.slots) ? b.slots[0] : b.slots)?.studios?.name
            });
        }
    });

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log('Resulting Transactions:', JSON.stringify(transactions, null, 2));
}

verify();
