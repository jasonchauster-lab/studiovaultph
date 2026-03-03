const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- CHECKING TIMOTHY KIM (INSTRUCTOR) ---');

    // Find instructor by name
    const { data: instructor } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', '%Timothy Kim%')
        .single();

    if (!instructor) {
        console.log('Instructor Timothy Kim not found.');
        return;
    }

    console.log(`Instructor ID: ${instructor.id}`);

    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            payment_status,
            price_breakdown,
            created_at,
            slots (
                date,
                start_time
            )
        `)
        .eq('instructor_id', instructor.id)
        .order('created_at', { ascending: false });

    console.log(`Found ${bookings?.length || 0} bookings.`);
    bookings?.forEach(b => {
        console.log(`Booking ${b.id}: status=${b.status}, payment_status=${b.payment_status}, date=${b.slots?.date}, price_breakdown=${JSON.stringify(b.price_breakdown)}`);
    });
}

run();
