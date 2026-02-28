import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const statuses = ['approved', 'admin_approved', 'confirmed', 'paid', 'completed', 'rejected', 'pending']
    console.log('Testing statuses:', statuses)

    for (const status of statuses) {
        const { error } = await supabase
            .from('bookings')
            .select('id')
            .eq('status', status)
            .limit(1)

        if (error && error.code === '22P02') {
            console.log(`Status "${status}" is INVALID`)
        } else if (error) {
            console.log(`Status "${status}" error:`, error.message)
        } else {
            console.log(`Status "${status}" is VALID`)
        }
    }
}

main()
