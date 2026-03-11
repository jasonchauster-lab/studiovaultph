const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://wzacmyemiljzpdskyvie.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    try {
        const timothyId = 'f88938fc-eaa0-491a-8283-2972da96e24b';
        console.log(`Checking sessions for Timothy Kim (${timothyId})...`);

        const { data: bookings, error: bError } = await supabase
            .from('bookings')
            .select('id, status, created_at, slot_id, slots(id, date, start_time, end_time)')
            .eq('instructor_id', timothyId);

        if (bError) {
            console.error('Bookings error:', bError);
        } else {
            console.log(`Found ${bookings.length} bookings total.`);
            bookings.forEach(b => {
                console.log(`Booking ID: ${b.id}, Status: ${b.status}, CreatedAt: ${b.created_at}, Slot: ${JSON.stringify(b.slots)}`);
            });
        }

        // Also check if Timothy has availability but no bookings
        const { data: availability, error: aError } = await supabase
            .from('instructor_availability')
            .select('*')
            .eq('instructor_id', timothyId);

        if (aError) {
            console.error('Availability error:', aError);
        } else {
            console.log(`Found ${availability.length} availability records.`);
            const today = '2026-03-11';
            const future = availability.filter(a => a.date >= today);
            const past = availability.filter(a => a.date < today);
            console.log(`Future slots: ${future.length}`);
            console.log(`Past slots: ${past.length}`);
            if (future.length > 0) {
                console.log('Sample future slotsReserved:');
                future.slice(0, 5).forEach(a => console.log(JSON.stringify(a)));
            }
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

check();
