import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log('Testing analytics query...')
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
            id,
            total_price,
            created_at,
            price_breakdown,
            status,
            client:profiles!client_id(full_name),
            slots(
                studios(name)
            ),
            instructor:profiles!instructor_id(full_name)
        `)
        .in('status', ['approved', 'admin_approved'])
        .order('created_at', { ascending: true })

    if (bookingsError) {
        console.error('Bookings Query Error:', JSON.stringify(bookingsError, null, 2))
    } else {
        console.log('Bookings count:', bookings?.length)
        if (bookings && bookings.length > 0) {
            console.log('Sample booking:', JSON.stringify(bookings[0], null, 2))
        }
    }
}

main()
