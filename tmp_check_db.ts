import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase
        .from('bookings')
        .select('id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Error:', error)
    } else {
        console.log(data)
    }
}

main()
