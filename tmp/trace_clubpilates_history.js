
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = '909c5932-4410-415e-8743-26d5f3b4d8d4';

async function traceHistory() {
    console.log(`--- Tracing History for Clubpilates PH (${userId}) ---`);

    // 1. Get Top Ups / Adjustments
    const { data: topUps } = await supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    console.log('\n--- Wallet Top Ups / Admin Adjustments ---');
    topUps.forEach(t => {
        console.log(`[${t.created_at}] Amount: ${t.amount} | Type: ${t.type} | Status: ${t.status} | Notes: ${t.admin_notes || 'N/A'}`);
    });

    // 2. Get Wallet Actions (Transfers, Penalties, etc.)
    const { data: actions } = await supabase
        .from('wallet_actions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    console.log('\n--- Wallet Actions ---');
    if (actions) {
        actions.forEach(a => {
            console.log(`[${a.created_at}] Amount: ${a.amount} | Type: ${a.type} | Details: ${a.details || 'N/A'}`);
        });
    } else {
        console.log('No wallet actions found (table might be empty or role restricted)');
    }

    // 3. Get Bookings Cancellations
    const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, price_breakdown, created_at, updated_at')
        .eq('slots->studios->owner_id', userId) // This might not work due to JSON depth, using a filter instead if needed
        .is('status', 'cancelled');

    // Fallback if the above query is too complex for JS filter
    const { data: allStudioBookings } = await supabase
        .from('bookings')
        .select('id, status, price_breakdown, created_at, updated_at, slot_id, slots!inner(studio_id)')
        .eq('slots.studio_id', 'e6a2d39e-b888-4b84-9c6d-5711a62c9920')
        .eq('status', 'cancelled');

    console.log('\n--- Cancelled Bookings ---');
    if (allStudioBookings) {
        allStudioBookings.forEach(b => {
            console.log(`[${b.updated_at}] Booking ID: ${b.id} | Status: ${b.status} | Breakdown: ${JSON.stringify(b.price_breakdown)}`);
        });
    }

    // 4. Current Profile State
    const { data: profile } = await supabase
        .from('profiles')
        .select('available_balance, wallet_balance')
        .eq('id', userId)
        .single();

    console.log('\n--- Current Profile State ---');
    console.log(`Available Balance: ${profile.available_balance}`);
    console.log(`Wallet Balance: ${profile.wallet_balance}`);
}

traceHistory();
