
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkBookings() {
    const userEmail = 'jadenphan4@gmail.com'
    const studioSlug = 'clubpilatesph'

    console.log(`Checking bookings for ${userEmail} at studio ${studioSlug}...`)

    // 1. Get User ID
    const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single()

    if (userError) {
        console.error('User not found:', userError)
        return
    }
    console.log('User ID:', user.id)

    // 2. Get Studio ID
    const { data: studio, error: studioError } = await supabase
        .from('studios')
        .select('id')
        .eq('slug', studioSlug)
        .single()

    if (studioError) {
        console.error('Studio not found:', studioError)
        return
    }
    console.log('Studio ID:', studio.id)

    // 3. Get Bookings
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', user.id)
        .eq('studio_id', studio.id)

    if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError)
        return
    }

    console.log(`Found ${bookings.length} bookings:`)
    console.log(JSON.stringify(bookings, null, 2))
}

checkBookings()
