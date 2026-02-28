import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase
        .from('studios')
        .select('id, name, logo_url, space_photos_urls, verified')
        .ilike('name', '%Clubpilates%')

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Studios:', JSON.stringify(data, null, 2))
    }
}

main()
