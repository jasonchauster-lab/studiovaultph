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
    console.log('--- CHECKING BOOKINGS ---');
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            total_price,
            created_at,
            slot_id,
            slots (
                date,
                start_time
            )
        `);

    if (error) {
        console.error('Error fetching bookings:', error);
        return;
    }

    console.log(`Found ${bookings.length} bookings total.`);
    bookings.forEach(b => {
        console.log(`ID: ${b.id}, Status: ${b.status}, Price: ${b.total_price}, Created: ${b.created_at}, Slot Date: ${b.slots?.date}`);
    });

    console.log('--- ANALYTICS QUERY SIMULATION ---');
    const startDate = '2026-02-24'; // Example 7 days ago if today is March 3
    const { data: filtered } = await supabase
        .from('bookings')
        .select(`
            id, status, slots!inner(date)
        `)
        .in('status', ['approved', 'completed', 'cancelled_charged']);

    console.log(`Filtered by status count: ${filtered?.length || 0}`);
}

run();
