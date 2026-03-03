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
    console.log('Checking recent bookings...');

    // Get bookings from the last 7 days to be safe
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            client_id,
            status,
            created_at,
            profiles!client_id(full_name, email),
            slots(id, date, start_time, end_time)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching bookings:', error);
        return;
    }

    if (!bookings || bookings.length === 0) {
        console.log('No recent bookings found.');
        return;
    }

    console.log('Recent Bookings:');
    bookings.forEach(b => {
        console.log(`- ID: ${b.id}`);
        console.log(`  Customer: ${b.profiles?.full_name} (${b.profiles?.email})`);
        console.log(`  Status: ${b.status}`);
        console.log(`  Slot Data:`, b.slots);
        // Test the date comparison logic
        const testDate = new Date(b.slots?.start_time);
        console.log(`  new Date(slots.start_time): ${testDate}`);
        console.log(`  Is greater than now? ${testDate > new Date()}`);
        console.log('---');
    });
}

run();
