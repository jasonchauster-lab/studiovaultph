
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = '909c5932-4410-415e-8743-26d5f3b4d8d4';
const studioId = 'e6a2d39e-b888-4b84-9c6d-5711a62c9920';

async function definitiveAudit() {
    console.log(`--- Reconciling Transaction History for Clubpilates PH ---`);

    // 1. Top-ups
    const { data: records } = await supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    console.log('\n[Wallet Adjustments/Top-Ups]');
    let runningSumApproved = 0;
    (records || []).forEach(r => {
        const amt = Number(r.amount);
        if (r.status === 'approved') {
            runningSumApproved += amt;
        }
        console.log(`- ${r.created_at} | ${amt > 0 ? '+' : ''}${amt} | ${r.status.toUpperCase()} | ${r.type} | ${r.admin_notes || '-'}`);
    });

    // 2. Penalties
    const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, price_breakdown, updated_at, slot_id, slots!inner(studio_id)')
        .eq('slots.studio_id', studioId);

    let sumPenalties = 0;
    console.log('\n[Penalties]');
    (bookings || []).forEach(b => {
        const breakdown = b.price_breakdown || {};
        if (breakdown.penalty_processed) {
            const amt = Number(breakdown.penalty_amount || 0);
            sumPenalties += amt;
            console.log(`- ${b.updated_at} | -${amt} | ${b.status} | ID: ${b.id}`);
        }
    });

    // 3. Earnings
    let sumEarnings = 0;
    console.log('\n[Earnings (Unlocked)]');
    (bookings || []).forEach(b => {
        if (b.status === 'completed' && b.funds_unlocked) {
            const amt = Number(b.price_breakdown?.studio_fee || 0);
            sumEarnings += amt;
            console.log(`- ${b.updated_at} | +${amt} | COMPLETED | ID: ${b.id}`);
        }
    });

    // 4. Verification
    const { data: profile } = await supabase.from('profiles').select('available_balance').eq('id', userId).single();

    console.log('\n--- Final Reconciliation ---');
    console.log(`Approved Credits:      +${runningSumApproved}`);
    console.log(`Processed Penalties:   -${sumPenalties}`);
    console.log(`Unlocked Earnings:     +${sumEarnings}`);
    console.log(`-----------------------------------`);
    const expected = runningSumApproved - sumPenalties + sumEarnings;
    console.log(`Calculated Logic:       ${expected}`);
    console.log(`Profile Balance:        ${profile.available_balance}`);

    if (Math.abs(expected - Number(profile.available_balance)) > 1) {
        console.log('\n❌ DISCREPANCY DETECTED!');
    } else {
        console.log('\n✅ Balances match history.');
    }
}

definitiveAudit();
