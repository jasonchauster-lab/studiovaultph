import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function test() {
    const { data: tables, error } = await supabase.rpc('get_table_names')
    console.log('Tables:', tables || error)

    const { data: cols, error: err } = await supabase.from('instructor_availability').select('*').limit(1)
    if (cols?.[0]) console.log('Instructor Availability structure:', Object.keys(cols[0]))
    
    const { data: bookings, error: berr } = await supabase.from('bookings').select('*, slots(*)').limit(1)
    if (bookings?.[0]) console.log('Booking/Slot structure:', JSON.stringify(bookings[0], null, 2))
}

test()
