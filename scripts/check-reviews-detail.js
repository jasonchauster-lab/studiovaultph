const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkReviewsDetail() {
    const { data: reviews, error } = await supabase.from('reviews').select(`
    *,
    reviewer:profiles!reviewer_id (full_name, role),
    reviewee:profiles!reviewee_id (full_name, role)
  `)
    if (error) {
        console.error('Error fetching reviews:', error)
        return
    }

    console.log('Detailed Reviews:')
    reviews?.forEach(r => {
        console.log(`Review ID: ${r.id}`)
        console.log(`Booking ID: ${r.booking_id}`)
        console.log(`Reviewer: ${r.reviewer ? r.reviewer.full_name : 'Unknown'} (${r.reviewer ? r.reviewer.role : 'N/A'})`)
        console.log(`Reviewee: ${r.reviewee ? r.reviewee.full_name : 'Unknown'} (${r.reviewee ? r.reviewee.role : 'N/A'})`)
        console.log(`Rating: ${r.rating}`)
        console.log(`Comment: ${r.comment}`)
        console.log(`Created At: ${r.created_at}`)
        console.log('-------------------')
    })
}

checkReviewsDetail()
