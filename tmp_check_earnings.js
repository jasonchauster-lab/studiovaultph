const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
    const env = fs.readFileSync('.env.local', 'utf8');
    const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
    const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

    if (!url || !key) {
        console.error('Failed to parse URL or Key from .env.local');
        return;
    }

    const supabase = createClient(url, key);

    const studioId = 'e6a2d39e-b888-4b84-9c6d-5711a62c9920';
    console.log(`Checking earnings for Studio: ${studioId}`);

    // 1. Fetch ALL bookings and their slots
    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            total_price,
            price_breakdown,
            created_at,
            slot_id,
            slots (
                id,
                studio_id,
                date
            )
        `);

    if (bError) {
        console.error('Error fetching bookings:', bError);
        return;
    }

    console.log(`Total Bookings in DB: ${bookings.length}`);

    // 2. Filter for bookings belonging to this studio
    const studioBookings = bookings.filter(b => b.slots?.studio_id === studioId);
    console.log(`Bookings linked to Studio ${studioId}: ${studioBookings.length}`);

    if (studioBookings.length > 0) {
        studioBookings.forEach(b => {
            console.log(`  - Booking ID: ${b.id}, Status: ${b.status}, Total: ${b.total_price}, Date: ${b.slots?.date}`);
        });
    }

    // 3. Check for "orphaned" bookings (slot_id is null or slot is missing studio_id)
    const orphans = studioBookings.filter(b => !b.slots);
    console.log(`Orphaned Bookings (missing slot): ${orphans.length}`);

    // 4. Check Wallet Transactions for this studio owner
    const { data: studioData } = await supabase.from('studios').select('owner_id').eq('id', studioId).single();
    if (studioData) {
        const ownerId = studioData.owner_id;
        console.log(`Owner ID: ${ownerId}`);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', ownerId).single();
        console.log(`Profile Balance: Available: ${profile?.available_balance}, Pending: ${profile?.pending_balance}`);

        const { data: walletActions } = await supabase.from('wallet_top_ups').select('*').eq('user_id', ownerId).eq('status', 'approved');
        console.log(`Wallet Approved Actions: ${walletActions?.length || 0}`);
        walletActions?.forEach(wa => {
            console.log(`  - ${wa.type}: ${wa.amount} (${wa.processed_at || wa.created_at})`);
        });
    }
}

run();
