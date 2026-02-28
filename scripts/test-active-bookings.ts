import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
    const { data: activeBookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            instructor_id,
            slots (
                start_time
            )
        `)
        .in('status', ['pending', 'confirmed', 'paid', 'submitted'])
        .limit(20)

    console.log("activeBookings", JSON.stringify(activeBookings, null, 2))
    if (error) console.error(error)
}

run().catch(console.error)
