import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
    console.log('Checking profiles table...')
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .single()

    if (pError) {
        console.error('Error fetching profile:', pError)
    } else {
        console.log('Profile columns:', Object.keys(profile))
    }

    console.log('\nChecking bookings table...')
    const { data: booking, error: bError } = await supabase
        .from('bookings')
        .select('*')
        .limit(1)
        .single()

    if (bError) {
        console.error('Error fetching booking:', bError)
    } else {
        console.log('Booking columns:', Object.keys(booking))
    }
}

checkSchema()
