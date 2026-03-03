
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = '909c5932-4410-415e-8743-26d5f3b4d8d4';
const studioId = 'e6a2d39e-b888-4b84-9c6d-5711a62c9920';

async function performAudit() {
    console.log(`--- Comprehensive Wallet Audit for Clubpilates PH (${userId}) ---`);

    // 1. Get all approved/processed top-ups and adjustments
    const { data: topUps } = await supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved');

    let sumTopUps = 0;
    console.log('\n[Top Ups & Adjustments]');
    (topUps || []).forEach(t => {
        const amt = Number(t.amount);
        sumTopUps += amt;
        console.log(`- ${t.created_at}: ${amt > 0 ? '+' : ''}${amt} (${t.type}) - ${t.admin_notes || 'No notes'}`);
    });

    // 2. Get all bookings for this studio
    const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, price_breakdown, updated_at, slot_id, funds_unlocked, slots!inner(studio_id)')
        .eq('slots.studio_id', studioId);

    let sumPenalties = 0;
    let sumEarnings = 0;

    console.log('\n[Booking Penalties]');
    (bookings || []).forEach(b => {
        if (b.status === 'cancelled_refunded' || b.status === 'cancelled_charged') {
            const breakdown = b.price_breakdown || {};
            if (breakdown.penalty_processed) {
                const penalty = Number(breakdown.penalty_amount || 0);
                sumPenalties += penalty;
                console.log(`- ${b.updated_at}: -${penalty} (Booking: ${b.id})`);
            }
        }
    });

    console.log('\n[Studio Earnings (Unlocked)]');
    (bookings || []).forEach(b => {
        if (b.status === 'completed' && b.funds_unlocked) {
            const amt = Number(b.price_breakdown?.studio_fee || 0);
            sumEarnings += amt;
            console.log(`- ${b.updated_at}: +${amt} (Booking: ${b.id})`);
        }
    });

    // 4. Calculate expected
    const expectedBalance = sumTopUps - sumPenalties + sumEarnings;

    // 5. Get actual
    const { data: profile } = await supabase
        .from('profiles')
        .select('available_balance, wallet_balance')
        .eq('id', userId)
        .single();

    console.log('\n--- Final Comparison ---');
    console.log(`Sum of Top-ups/Adjustments: ${sumTopUps.toFixed(2)}`);
    console.log(`Sum of Penalties:          -${sumPenalties.toFixed(2)}`);
    console.log(`Sum of Earnings:           +${sumEarnings.toFixed(2)}`);
    console.log(`------------------------------`);
    console.log(`Expected Balance:           ${expectedBalance.toFixed(2)}`);
    console.log(`Actual Available Balance:   ${profile.available_balance}`);
    console.log(`Actual Wallet Balance:      ${profile.wallet_balance}`);

    if (Math.abs(expectedBalance - Number(profile.available_balance)) > 0.01) {
        console.log('\n❌ DISCREPANCY DETECTED!');
    } else {
        console.log('\n✅ Balances match expectations.');
    }
}

performAudit();
