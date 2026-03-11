
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReviews() {
    console.log('Searching for "Club Pilates" studio...');
    const { data: studios, error: sError } = await supabase
        .from('studios')
        .select('id, name, owner_id')
        .ilike('name', '%Pilates%');

    if (sError) {
        console.error('Error fetching studios:', sError);
        return;
    }

    console.log('Studios found:', studios);

    const ownerIds = studios.map(s => s.owner_id);
    
    console.log('Searching for reviews for these owners...');
    const { data: reviews, error: rError } = await supabase
        .from('reviews')
        .select('*, profiles!reviewer_id(full_name)')
        .in('reviewee_id', ownerIds);

    if (rError) {
        console.error('Error fetching reviews:', rError);
        return;
    }

    console.log('Reviews found:', JSON.stringify(reviews, null, 2));

    if (reviews.length > 0) {
        // Check if there are counterpart reviews for these bookings
        const bookingIds = reviews.map(r => r.booking_id);
        const { data: counterparts } = await supabase
            .from('reviews')
            .select('*')
            .in('booking_id', bookingIds);
        
        console.log('All reviews for these bookings:', JSON.stringify(counterparts, null, 2));
    }
}

checkReviews();
