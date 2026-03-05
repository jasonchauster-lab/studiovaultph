const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkReviews() {
    const { data: reviews, error } = await supabase.from('reviews').select('*')
    if (error) {
        console.error('Error fetching reviews:', error)
        return
    }

    console.log('Total reviews:', reviews.length)

    const counts = {}
    reviews.forEach(r => {
        counts[r.reviewee_id] = (counts[r.reviewee_id] || 0) + 1
    })

    console.log('Review counts per reviewee_id:', JSON.stringify(counts, null, 2))

    const { data: profiles } = await supabase.from('profiles').select('id, full_name, role')
    const profileMap = {}
    profiles?.forEach(p => { profileMap[p.id] = p })

    console.log('Instructor Ratings Breakdown:')
    for (const [id, count] of Object.entries(counts)) {
        const p = profileMap[id]
        console.log(`- ${p ? p.full_name : id} (${p ? p.role : 'N/A'}): ${count} reviews`)
    }
}

checkReviews()
