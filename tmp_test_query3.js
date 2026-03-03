const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUpcomingBookingsQuery() {
    const todayStr = '2026-03-03';
    const nowTimeStr = '06:00:00';
    const studioSlotIds = ['33149f24-fbd2-42db-8cea-f9b839b97b25'];

    // We already know `.or` with foreignTable string syntax failed entirely.
    // The previous app code had `.or('date.gt...', { foreignTable: 'slots' })`
    // Let's test the exact syntax the app uses to see if it just returns [] and why.

    const { data: appQuery, error: appError } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slot_id,
            slots!inner(
                id,
                date,
                start_time
            )
        `)
        .in('slot_id', studioSlotIds)
        .in('status', ['approved', 'pending'])
        .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`, { foreignTable: 'slots' })

    console.log("App Query Results:", JSON.stringify(appQuery, null, 2));
    if (appError) console.error("App Query Error:", appError);

    // Let's test what happens if we DON'T use `.or` on the foreign table
    // and instead just fetch them and filter in JS, or if there's alternative syntax.
    const { data: allBookings } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slot_id,
            slots!inner(
                id,
                date,
                start_time
            )
        `)
        .in('slot_id', studioSlotIds)
        .in('status', ['approved', 'pending']);

    console.log("\nAll matching bookings without time filter:", JSON.stringify(allBookings, null, 2));
}

checkUpcomingBookingsQuery();
