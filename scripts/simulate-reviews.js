const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

const profileId = 'c9038ba0-a2d7-4f64-a695-fa17d16a01b4' // Emma Instructor
const DOUBLE_BLIND_HOURS = 48

async function simulateGetPublicReviews() {
    console.log('Fetching reviews for profile:', profileId)

    const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
            id,
            booking_id,
            reviewer_id,
            rating,
            comment,
            tags,
            created_at
        `)
        .eq('reviewee_id', profileId)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log(`Found ${reviews.length} reviews.`)

    const now = Date.now()
    const cutoffMs = DOUBLE_BLIND_HOURS * 60 * 60 * 1000

    const visibleReviews = await Promise.all(
        reviews.map(async (review) => {
            const createdAt = new Date(review.created_at).getTime()
            const isExpired = now - createdAt >= cutoffMs
            console.log(`Review ${review.id}: createdAt=${review.created_at}, isExpired=${isExpired}`)

            if (isExpired) return review

            const { count, error: countErr } = await supabase
                .from('reviews')
                .select('id', { count: 'exact', head: true })
                .eq('booking_id', review.booking_id)
                .neq('reviewer_id', review.reviewer_id)

            if (countErr) console.error('Count Err:', countErr)
            console.log(`Counterpart count for booking ${review.booking_id}: ${count}`)

            if ((count ?? 0) > 0) return review

            return null
        })
    )

    const filtered = visibleReviews.filter(Boolean)
    console.log('Final visible reviews count:', filtered.length)
}

simulateGetPublicReviews()
