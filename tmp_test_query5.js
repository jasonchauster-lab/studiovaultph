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
    // NOTE: in the actual file, the `.or` query is NOT using `slots.date` and `slots.start_time` prefix!
    // It's just `date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`
    // And there's NO foreignTable option attached to `.or()` in `page.tsx`. Wait, let's look closer at page.tsx.

    // In page.tsx:
    // .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`)
    // NO foreign table option is used inside .or()! That means it's checking `bookings.date` and `bookings.start_time`.
    // But bookings table doesn't HAVE a `date` or `start_time` column! It's checking columns that don't exist?

    const todayStr = '2026-03-03';
    const nowTimeStr = '14:05:13';

    const { data: upcomingBookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slots!inner(id, date, start_time)
        `)
        .in('slot_id', studioSlotIds)
        .in('status', ['approved', 'pending'])
        .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`, { foreignTable: 'slots' });
    // Note: the app code DOES NOT have `{ foreignTable: 'slots' }` on `.or()`!

    console.log(`With foreignTable hint, returns ${upcomingBookings?.length || 0}`);

    const { data: noHintQuery, error: noHintError } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slots!inner(id, date, start_time)
        `)
        .in('slot_id', studioSlotIds)
        .in('status', ['approved', 'pending'])
        .or(`slots.date.gt.${todayStr},and(slots.date.eq.${todayStr},slots.start_time.gte.${nowTimeStr})`); // App doesn't have slots. format either

    console.log(`Testing with slots. format without hint returns Error:`, noHintError?.message);

    // What exactly is the error if run exactly as in page.tsx?!
    const { data: exactAppQuery, error: exactAppError } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slots!inner(id, date, start_time)
        `)
        .in('slot_id', studioSlotIds)
        .in('status', ['approved', 'pending'])
        .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`); // EXACTLY as in app

    console.log(`\nEXACT APP QUERY RESULT:`, exactAppQuery?.length || 0);
    console.log(`EXACT APP QUERY ERROR:`, exactAppError?.message);

}

checkWhyBookingsArentShowing();
