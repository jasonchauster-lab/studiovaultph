
import { createAdminClient } from './lib/supabase/server'

async function debugColumns() {
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
        .from('bookings')
        .select('*')
        .limit(1)
    
    if (error) {
        console.error('Error fetching bookings:', error)
    } else {
        console.log('Booking columns:', Object.keys(data[0] || {}))
    }
}

debugColumns()
