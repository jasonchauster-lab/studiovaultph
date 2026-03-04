const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            client_id,
            instructor_id,
            created_at,
            total_price,
            price_breakdown,
            rejection_reason,
            client:profiles!client_id(full_name, email),
            slots:slots(date, start_time, studios(name))
        `)
        .eq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching bookings:', error);
        return;
    }

    console.log('Recent Rejected Bookings:');
    console.log(JSON.stringify(bookings, null, 2));

    if (bookings.length > 0) {
        const clientId = bookings[0].client_id;
        console.log(`\nChecking balance for client ${clientId}:`);
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('available_balance')
            .eq('id', clientId)
            .single();
        if (profileError) console.error(profileError);
        else console.log(profile);
    }
}

check();
