const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEnumValues() {
    const { data, error } = await supabase.rpc('get_enum_values', { enum_name: 'booking_status' });

    if (error) {
        // Fallback: try querying a system table if RPC doesn't exist
        const { data: enumData, error: enumError } = await supabase.from('pg_enum').select('*').limit(1);
        if (enumError) {
            // Second fallback: just try to fetch all statuses currently in the bookings table
            const { data: statuses } = await supabase.from('bookings').select('status');
            console.log('Current statuses in bookings table:', [...new Set(statuses?.map(s => s.status))]);
            return;
        }
        console.log('Enum data:', enumData);
    } else {
        console.log('Booking status enum values:', data);
    }
}

async function checkAllStatuses() {
    const { data: statuses, error } = await supabase.from('bookings').select('status');
    if (error) {
        console.error('Error fetching statuses:', error);
    } else {
        console.log('Unique statuses in bookings table:', [...new Set(statuses.map(s => s.status))]);
    }
}

checkAllStatuses();
