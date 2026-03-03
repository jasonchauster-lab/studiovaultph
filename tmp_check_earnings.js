const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: b } = await supabase
        .from('bookings')
        .select('id, status, total_price, quantity, price_breakdown, payment_status, created_at')
        .in('status', ['approved', 'completed'])
        .order('created_at', { ascending: false })
        .limit(10);

    console.log("RECENT COMPLETED/APPROVED BOOKINGS:");
    console.log(JSON.stringify(b, null, 2));
}

check();
