const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUpcomingBookingsQuery() {
    const todayStr = '2026-03-03';
    const nowTimeStr = '06:00:00';
    const studioSlotIds = ['33149f24-fbd2-42db-8cea-f9b839b97b25'];

    // The query EXACTLY as written in the application code snippet:
    const { data: studioBookings, error } = await supabase
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

    if (error) {
        console.error('Error with exact code query:', error);
    } else {
        console.log(`Original query returning: ${studioBookings?.length} rows`);
    }

    // Now test with slots.date instead
    const { data: fixed, error: err2 } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slots!inner(id, date, start_time)
        `)
        .in('slot_id', studioSlotIds)
        .in('status', ['approved', 'pending'])
        .or(`slots.date.gt.${todayStr},and(slots.date.eq.${todayStr},slots.start_time.gte.${nowTimeStr})`)
        .order('date', { foreignTable: 'slots', ascending: true })
        .order('start_time', { foreignTable: 'slots', ascending: true })
        .limit(10);

    if (err2) {
        console.error('Error with fixed query:', err2);
    } else {
        console.log(`Fixed query returning: ${fixed?.length} rows`);
    }
}

checkUpcomingBookingsQuery();
