const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching enum values for booking_status...');

    const { data, error } = await supabase.rpc('get_enum_values', { type_name: 'booking_status' });

    if (error) {
        console.log('RPC get_enum_values failed, trying manual query via information_schema...');
        // We can't do raw SQL easily from JS client without a specific RPC.
        // Let's try to infer from existing data mapping or fallback.
        const { data: sample } = await supabase.from('bookings').select('status').limit(10);
        console.log('Inferred statuses from table:', [...new Set(sample?.map(s => s.status))]);
    } else {
        console.log('Enum values:', data);
    }
}

run();
