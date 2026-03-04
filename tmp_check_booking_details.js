const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookingDetails() {
    console.log('--- Checking Booking Details ---');

    const bookingIds = ['3cc7d783-b63a-4b35-8530-b8a14dd12331', '9012dd00-588a-425c-bb59-b0f984865747'];

    for (const id of bookingIds) {
        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`
                id,
                status,
                client_id,
                instructor_id,
                client:profiles!client_id(full_name, email),
                instructor:profiles!instructor_id(full_name, email)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error(`Error for ${id}:`, error);
            continue;
        }

        console.log(`Booking ${id}:`);
        console.log(`  Status: ${booking.status}`);
        console.log(`  Client: ${booking.client?.full_name} (${booking.client?.email}) [${booking.client_id}]`);
        console.log(`  Instructor: ${booking.instructor?.full_name} (${booking.instructor?.email}) [${booking.instructor_id}]`);
    }
}

checkBookingDetails();
