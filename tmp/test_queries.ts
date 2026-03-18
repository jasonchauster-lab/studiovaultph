
import { createAdminClient } from '../lib/supabase/server'

async function testQueries() {
    const supabase = createAdminClient()
    console.log('Testing Supabase queries...')

    const queries = [
        {
            name: 'Bookings',
            query: supabase.from('bookings').select(`
                *,
                client:profiles!client_id(full_name, email),
                instructor:profiles!instructor_id(full_name, email),
                slots(
                    date,
                    start_time,
                    end_time,
                    studios(
                        name,
                        location,
                        address,
                        profiles!owner_id(full_name, email)
                    )
                )
            `).eq('status', 'pending')
        },
        {
            name: 'Payout Requests',
            query: supabase.from('payout_requests').select('*, instructor:profiles!instructor_id(id, full_name, email)').eq('status', 'pending')
        },
        {
            name: 'Studio Payout Requests',
            query: supabase.from('payout_requests').select('*, studios(name, profiles(full_name))').eq('status', 'pending').not('studio_id', 'is', null)
        },
        {
            name: 'Customer Payout Requests',
            query: supabase.from('payout_requests').select('*, profile:profiles!user_id(id, full_name, role, email)').eq('status', 'pending').not('user_id', 'is', null).is('instructor_id', null).is('studio_id', null)
        }
    ]

    for (const q of queries) {
        process.stdout.write(`Testing ${q.name}... `)
        try {
            const { data, error } = await q.query
            if (error) {
                console.log('❌ FAILED')
                console.error(error)
            } else {
                console.log(`✅ PASSED (${data?.length || 0} rows)`)
                if (data && data.length > 0) {
                    data.forEach((item: any, index: number) => {
                        if (q.name === 'Bookings') {
                            if (!item.slots) console.log(`   - [Booking ${item.id}] ERROR: Null slots`)
                            else if (!item.slots.date) console.log(`   - [Booking ${item.id}] ERROR: Null slots.date`)
                        }
                        if (q.name === 'Payout Requests' || q.name === 'Studio Payout Requests') {
                            if (item.amount === null || item.amount === undefined) console.log(`   - [Payout ${item.id}] ERROR: Null amount`)
                        }
                        if (q.name === 'Wallet Top-ups') {
                            if (item.amount === null || item.amount === undefined) console.log(`   - [Top-up ${item.id}] ERROR: Null amount`)
                        }
                    })
                }
            }
        } catch (e) {
            console.log('💥 CRASHED')
            console.error(e)
        }
    }
}

testQueries()
