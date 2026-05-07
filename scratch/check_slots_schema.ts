import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function checkSchema() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data, error } = await supabase.from('slots').select('*').limit(1)
    if (error) {
        console.error('Error fetching slot:', error)
    } else {
        console.log('Columns in slots:', Object.keys(data[0] || {}))
    }
}

checkSchema()
