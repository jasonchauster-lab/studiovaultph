const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];

const supabase = createClient(url, key);

const studioId = 'e6a2d39e-b888-4b84-9c6d-5711a62c9920';

async function check() {
    console.log(`Detailed Studio Analysis: ${studioId}`);

    // Fetch studio slots
    const { data: slots, error: slotsError } = await supabase
        .from('slots')
        .select('*')
        .eq('studio_id', studioId);

    if (slotsError) {
        console.error('Error fetching slots:', slotsError);
        return;
    }

    const slotIds = slots.map(s => s.id);
    console.log(`Found ${slots.length} total slots.`);

    // Occupancy (Current Week)
    // The screenshot shows week of Mar 2 - Mar 8
    const weekStart = '2026-03-02';
    const weekEnd = '2026-03-08';

    const weeklySlots = slots.filter(s => s.date >= weekStart && s.date <= weekEnd);
    const bookedSlotsList = weeklySlots.filter(s => !s.is_available);

    console.log(`\n--- OCCUPANCY DETAILS (Week of ${weekStart}) ---`);
    console.log(`Weekly Slots (Total Listings): ${weeklySlots.length}`);
    console.log(`Booked Slots Count: ${bookedSlotsList.length}`);

    console.log('\nSlot Details for this week:');
    console.table(weeklySlots.map(s => ({
        id: s.id.slice(0, 8),
        date: s.date,
        start: s.start_time,
        available: s.is_available,
        equipment: JSON.stringify(s.equipment)
    })));

    if (weeklySlots.length > 0) {
        const occupancy = Math.round((bookedSlotsList.length / weeklySlots.length) * 100);
        console.log(`\nCALCULATED OCCUPANCY: ${occupancy}%`);
    } else {
        console.log(`CALCULATED OCCUPANCY: 0% (No slots)`);
    }

    // Check "Active Listings" metric
    // Dashboard: stats.activeListings: weeklySlots.length
    console.log(`\n--- ACTIVE LISTINGS ---`);
    console.log(`Dashboard would show: ${weeklySlots.length} slots`);

    // Fetch all relevant bookings
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
            *,
            instructor:profiles!instructor_id(full_name),
            slots(*)
        `)
        .in('slot_id', slotIds)
        .in('status', ['approved', 'completed', 'cancelled_charged', 'pending']);

    if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return;
    }

    console.log(`Found ${bookings.length} total bookings (pending/approved/etc).`);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    console.log(`\n--- ALL BOOKINGS IN LAST 30 DAYS (and future) ---`);
    console.table(bookings.map(b => ({
        id: b.id.slice(0, 8),
        date: b.slots?.date,
        status: b.status,
        instructor: b.instructor?.full_name,
        total: b.total_price,
        studio_fee: b.price_breakdown?.studio_fee,
        wallet: b.price_breakdown?.wallet_deduction || 0
    })));

    // Emulate the dashboard's revenue calc
    const statsBookings = bookings.filter(b =>
        ['approved', 'completed', 'cancelled_charged'].includes(b.status) &&
        b.slots?.date >= thirtyDaysAgoStr
    );

    let totalRevenue = 0;
    statsBookings.forEach(b => {
        const fee = b.price_breakdown?.studio_fee || (b.total_price ? Math.max(0, b.total_price - 100) : 0);
        totalRevenue += fee;
    });

    console.log(`\nMonthly Revenue Result: ₱${totalRevenue}`);
    console.log(`Count of bookings included: ${statsBookings.length}`);
}

check();
