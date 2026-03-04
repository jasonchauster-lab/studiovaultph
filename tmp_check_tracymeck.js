const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCustomerBookings() {
    console.log('--- Diagnostic: Customer Bookings for tracymeck ---');

    // 1. Find the profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or('full_name.ilike.%tracymeck%,email.ilike.%tracymeck%')
        .single();

    if (profileError) {
        console.error('Error fetching profile:', profileError);
        // If single fails, try listing
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .or('full_name.ilike.%tracymeck%,email.ilike.%tracymeck%');
        console.log('Matching profiles found:', profiles);
        return;
    }

    console.log('Profile found:', profile);

    // 2. Fetch bookings for this customer
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, created_at, slot_id')
        .eq('client_id', profile.id);

    if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return;
    }

    console.log(`Total bookings found for customer: ${bookings?.length ?? 0}`);

    if (bookings && bookings.length > 0) {
        console.log('Booking statuses found:', [...new Set(bookings.map(b => b.status))]);
        console.log('Bookings:', bookings);
    } else {
        console.log('No bookings found for this customer ID in the bookings table.');
    }
}

checkCustomerBookings();
