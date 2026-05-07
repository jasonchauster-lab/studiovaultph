
import { createAdminClient } from './lib/supabase/server'

async function debugStatuses() {
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
        .from('bookings')
        .select('status')
        .limit(100)
    
    if (error) {
        console.error('Error fetching bookings:', error)
    } else {
        const statuses = new Set(data.map(b => b.status))
        console.log('Existing Booking Statuses:', Array.from(statuses))
    }
}

debugStatuses()
