const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBookingStatusEnum() {
    const { data, error } = await supabase.rpc('get_enum_values', { enum_type: 'booking_status' })

    if (error) {
        // If RPC doesn't exist, try a standard query to information_schema via a trick or just fallback to listing some bookings
        console.log('Error calling RPC:', error.message)
        console.log('Attempting to fetch some bookings to see statuses...')
        const { data: bookings, error: bError } = await supabase.from('bookings').select('status').limit(50)
        if (bError) {
            console.error('Error fetching bookings:', bError.message)
        } else {
            const statuses = [...new Set(bookings.map(b => b.status))];
            console.log('Observed statuses in bookings table:', statuses)
        }
    } else {
        console.log('Enum values for booking_status:', data)
    }
}

checkBookingStatusEnum()
