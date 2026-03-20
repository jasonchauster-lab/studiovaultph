
import { createClient } from '@supabase/supabase-js'

const url = 'https://wzacmyemiljzpdskyvie.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(url, key)

async function checkUser() {
    console.log('Checking profiles for jchau199@gmail.com...')
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'jchau199@gmail.com')

    if (pError) {
        console.error('Error fetching profile:', pError)
    } else {
        console.log('Profiles found:', JSON.stringify(profiles, null, 2))
    }

    if (profiles && profiles.length > 0) {
        const userId = profiles[0].id
        console.log(`Checking bookings for user ID: ${userId}...`)
        const { data: bookings, error: bError } = await supabase
            .from('bookings')
            .select('*')
            .eq('client_id', userId)
        
        if (bError) {
            console.error('Error fetching bookings:', bError)
        } else {
            console.log(`Bookings found: ${bookings.length}`)
            for (const b of bookings) {
                console.log(`- Booking ${b.id}: status=${b.status}, slot_id=${b.slot_id}, instructor_id=${b.instructor_id}`)
                if (b.slot_id) {
                    const { data: slot, error: sError } = await supabase
                        .from('slots')
                        .select('*, studios(*)')
                        .eq('id', b.slot_id)
                        .maybeSingle()
                    
                    if (sError) console.error(`  Error fetching slot ${b.slot_id}:`, sError)
                    else if (!slot) console.error(`  Slot ${b.slot_id} NOT FOUND!`)
                    else console.log(`  Slot found: date=${slot.date}, studio=${slot.studios?.name}`)
                }
            }
        }

        console.log(`Checking if user is an instructor in any bookings...`)
        const { data: iBookings, error: iError } = await supabase
            .from('bookings')
            .select('id')
            .eq('instructor_id', userId)
        
        if (iError) {
            console.error('Error fetching instructor bookings:', iError)
        } else {
            console.log(`User is instructor for ${iBookings.length} bookings.`)
        }
    }
}

checkUser()
