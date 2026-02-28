import { createClient } from './lib/supabase/server'

async function check() {
    const supabase = await createClient()

    // 1. Get all studios
    const { data: studios } = await supabase.from('studios').select('id, name, owner_id')
    console.log('--- STUDIOS ---')
    console.table(studios)

    // 2. Get latest 10 bookings
    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slot_id,
            total_price,
            created_at,
            slots (
                id,
                studio_id,
                start_time
            )
        `)
        .order('created_at', { ascending: false })
        .limit(10)

    console.log('--- LATEST 10 BOOKINGS ---')
    console.log(JSON.stringify(bookings, null, 2))
}

check()
