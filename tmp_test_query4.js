const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWhyBookingsArentShowing() {
    // 1. Get the latest booking to find the studio
    const { data: latestBooking } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slot_id,
            booked_slot_ids,
            slots (
                id,
                studio_id
            )
        `)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!latestBooking) {
        console.log("No bookings found");
        return;
    }

    console.log("Latest Booking ID:", latestBooking.id);
    const studioId = latestBooking.slots?.studio_id;
    console.log("Belongs to Studio:", studioId);

    // 2. See what slots are under this studio
    const { data: studioSlots } = await supabase
        .from('slots')
        .select('id')
        .eq('studio_id', studioId);

    const studioSlotIds = studioSlots?.map(s => s.id) ?? [];
    console.log(`Studio has ${studioSlotIds.length} slots.`);

    // 3. Emulate the page.tsx upcoming bookings query
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const nowTimeStr = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour12: false });

    console.log(`Using todayStr: ${todayStr}, nowTimeStr: ${nowTimeStr}`);

    const { data: upcomingBookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slots!inner(id, date, start_time)
        `)
        .in('slot_id', studioSlotIds)
        .in('status', ['approved', 'pending'])
        .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`, { foreignTable: 'slots' })
        .order('date', { foreignTable: 'slots', ascending: true })
        .order('start_time', { foreignTable: 'slots', ascending: true })
        .limit(10);

    console.log(`Upcoming Bookings Query Returned: ${upcomingBookings?.length || 0} rows`);
    if (upcomingBookings?.length > 0) {
        console.log("First row ID:", upcomingBookings[0].id);
    }
}

checkWhyBookingsArentShowing();
