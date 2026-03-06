import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.DASHBOARD_MASTER_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkReviews() {
    const { data: reviews, error } = await supabase.from('reviews').select('*')
    if (error) {
        console.error('Error fetching reviews:', error)
        return
    }

    console.log('Total reviews:', reviews.length)

    const counts: Record<string, number> = {}
    reviews.forEach(r => {
        counts[r.reviewee_id] = (counts[r.reviewee_id] || 0) + 1
    })

    console.log('Review counts per reviewee_id:', JSON.stringify(counts, null, 2))

    const { data: profiles } = await supabase.from('profiles').select('id, full_name, role')
    const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p]) || [])

    console.log('Instructor Ratings Breakdown:')
    for (const [id, count] of Object.entries(counts)) {
        const p = profileMap[id]
        console.log(`- ${p?.full_name || id} (${p?.role || 'N/A'}): ${count} reviews`)
    }
}

checkReviews()
