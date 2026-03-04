const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAnyTracyBooking() {
    console.log('--- Searching for ANY booking related to Tracy/Meck ---');

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            client_id,
            client:profiles!client_id(full_name, email),
            instructor:profiles!instructor_id(full_name, email)
        `);

    if (error) {
        console.error(error);
        return;
    }

    const matches = bookings.filter(b => {
        const clientMatch = b.client?.full_name?.toLowerCase().includes('tracy') || b.client?.email?.toLowerCase().includes('tracy') || b.client?.full_name?.toLowerCase().includes('meck') || b.client?.email?.toLowerCase().includes('meck');
        const instructorMatch = b.instructor?.full_name?.toLowerCase().includes('tracy') || b.instructor?.email?.toLowerCase().includes('tracy') || b.instructor?.full_name?.toLowerCase().includes('meck') || b.instructor?.email?.toLowerCase().includes('meck');
        return clientMatch || instructorMatch;
    });

    console.log(`Found ${matches.length} matches:`);
    matches.forEach(m => {
        console.log(`Booking ${m.id} (${m.status}):`);
        console.log(`  Client: ${m.client?.full_name} (${m.client?.email}) [${m.client_id}]`);
        console.log(`  Instructor: ${m.instructor?.full_name} (${m.instructor?.email}) [${m.instructor_id}]`);
    });
}

findAnyTracyBooking();
