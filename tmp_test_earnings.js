const { getEarningsData } = require('./app/(dashboard)/studio/earnings/actions.js') || {};

// Since actions.ts is TS and has 'use server', we can't easily run it via require in node.
// We will write a small self-contained script to test the DB queries instead, similarly to before.
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEarningsQuery() {
    const studioId = 'e6a2d39e-b888-4b84-9c6d-5711a62c9920'; // From earlier tests
    const startDate = '2026-02-01';
    const endDate = '2026-03-04';

    console.log("Testing slots query...");
    const { data: studioSlots } = await supabase
        .from('slots')
        .select('id')
        .eq('studio_id', studioId);

    const slotIds = studioSlots?.map(s => s.id) ?? [];

    console.log(`Testing bookings query with slots.date for ${slotIds.length} slots...`);
    let bookingsQuery = supabase
        .from('bookings')
        .select(`
            *,
            slots!inner(start_time, end_time, date)
        `)
        .in('slot_id', slotIds)
        .or('status.in.(approved,completed,cancelled_charged,cancelled_refunded),payment_status.eq.submitted')
        .order('created_at', { ascending: false });

    // Simulate the new Logic
    if (startDate) bookingsQuery = bookingsQuery.gte('slots.date', startDate);
    if (endDate) bookingsQuery = bookingsQuery.lte('slots.date', endDate);

    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
        console.error("Error in bookings:", bookingsError);
    } else {
        console.log(`Success! Found ${bookings?.length} bookings.`);
    }

    console.log("Testing payouts query...");
    let payoutsQuery = supabase
        .from('payout_requests')
        .select('*')
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false })

    if (startDate) payoutsQuery = payoutsQuery.gte('created_at', `${startDate}T00:00:00.000Z`)
    if (endDate) payoutsQuery = payoutsQuery.lte('created_at', `${endDate}T23:59:59.999Z`)

    const { data: payouts, error: payoutsErr } = await payoutsQuery;
    if (payoutsErr) {
        console.error("Error in payouts:", payoutsErr);
    } else {
        console.log(`Success! Found ${payouts?.length || 0} payouts.`);
    }
}

testEarningsQuery();
