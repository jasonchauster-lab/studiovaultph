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
    console.log('Searching for specific booking...');

    // 1. Find Customer jchau199@gmail.com
    const { data: customer } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', 'jchau199@gmail.com')
        .single();

    console.log('Customer:', customer);

    // 2. Find Instructor Timothy
    const { data: instructors } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', '%Timothy%');

    console.log('Instructors matching "Timothy":', instructors);

    // 3. Find Studio Club Pilates
    const { data: studios } = await supabase
        .from('studios')
        .select('id, name')
        .ilike('name', '%Club Pilates%');

    console.log('Studios matching "Club Pilates":', studios);

    // 4. Find Bookings
    if (customer) {
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                slots (
                    *,
                    studios (*)
                ),
                instructor:profiles!instructor_id (*)
            `)
            .eq('client_id', customer.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching bookings:', error);
            return;
        }

        console.log(`\nFound ${bookings?.length || 0} bookings for this customer.`);

        bookings.forEach((b, i) => {
            console.log(`\n[Booking ${i + 1}]`);
            console.log(`ID: ${b.id}`);
            console.log(`Status: ${b.status}`);
            console.log(`Studio: ${b.slots?.studios?.name}`);
            console.log(`Instructor: ${b.instructor?.full_name}`);
            console.log(`Date: ${b.slots?.date}`);
            console.log(`Time: ${b.slots?.start_time} - ${b.slots?.end_time}`);
            console.log(`Updated At: ${b.updated_at}`);
        });
    }
}

run();
