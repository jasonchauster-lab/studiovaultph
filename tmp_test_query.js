const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUpcomingBookingsQuery() {
    const todayStr = '2026-03-03';
    const nowTimeStr = '06:00:00'; // test early time

    // The query as it is in the code:
    const { data: studioBookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slots!inner(
                id, date, start_time
            )
        `)
        .in('status', ['approved', 'pending'])
        .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`, { foreignTable: 'slots' })
        .order('date', { foreignTable: 'slots', ascending: true })
        .order('start_time', { foreignTable: 'slots', ascending: true })
        .limit(10);

    if (error) {
        console.error('Error with exact code query:', error);
    } else {
        console.log(`Exact code query returned ${studioBookings?.length} rows`);
        if (studioBookings?.length > 0) {
            console.log(JSON.stringify(studioBookings[0], null, 2));
        }
    }

    // A simpler query to see if any exist at all:
    const { data: allBookings, error: err2 } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slots!inner(
                id, date, start_time
            )
        `)
        .in('status', ['approved', 'pending'])
        .limit(10);

    console.log(`\nSimpler query returned ${allBookings?.length} rows`);
    if (allBookings?.length > 0) {
        console.log(JSON.stringify(allBookings[0], null, 2));
    }
}

checkUpcomingBookingsQuery();
