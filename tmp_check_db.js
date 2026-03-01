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
    console.log('Checking bookings table columns...');

    // We can't check types directly via JS easily without raw SQL access,
    // but we can check if certain columns exist and what some values are.
    const { data, error } = await supabase.from('bookings').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
        console.log('Sample status:', data[0].status);
        console.log('Sample payment_status:', data[0].payment_status);
    } else {
        console.log('No bookings found to sample.');
    }

    // Try to get all unique statuses currently in the table
    const { data: statuses, error: sError } = await supabase.rpc('get_unique_booking_statuses');
    if (sError) {
        console.log('RPC get_unique_booking_statuses not found, trying manual fetch...');
        const { data: allStats } = await supabase.from('bookings').select('status');
        const unique = [...new Set(allStats?.map(b => b.status))];
        console.log('Unique statuses in table:', unique);
    } else {
        console.log('Unique statuses (RPC):', statuses);
    }
}

run();
