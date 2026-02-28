import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log('Checking booking_status enum...')
    const { data, error } = await supabase.rpc('get_enum_values', { enum_name: 'booking_status' })

    if (error) {
        // Fallback: try to get it from pg_type
        const { data: data2, error: error2 } = await supabase
            .from('pg_type')
            .select('typname, pg_enum(enumlabel)')
            .eq('typname', 'booking_status')
            .single()

        if (error2) {
            console.error('Error fetching enum from pg_type:', error2)

            // Second fallback: just try a query and see what happens with a known good status
            const { data: data3, error: error3 } = await supabase
                .from('bookings')
                .select('status')
                .limit(10)

            if (error3) {
                console.error('Error fetching sample bookings:', error3)
            } else {
                console.log('Sample statuses from DB:', [...new Set(data3.map(b => b.status))])
            }
        } else {
            console.log('Enum values (pg_type):', data2)
        }
    } else {
        console.log('Enum values (RPC):', data)
    }
}

main()
