const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzacmyemiljzpdskyvie.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'
);

async function comprehensiveCheck() {
    console.log('--- SYSTEM HEALTH CHECK (Service Role) ---');

    const queries = [
        { name: 'Certifications', q: supabase.from('certifications').select('id').limit(1) },
        { name: 'Studios', q: supabase.from('studios').select('id').limit(1) },
        { name: 'Bookings', q: supabase.from('bookings').select('id').limit(1) },
        { name: 'Payout Requests', q: supabase.from('payout_requests').select('id').limit(1) },
        { name: 'Wallet Top-ups', q: supabase.from('wallet_top_ups').select('id').limit(1) },
        { name: 'Profiles', q: supabase.from('profiles').select('id').limit(1) },
        { name: 'Admin Activity Logs', q: supabase.from('admin_activity_logs').select('id').limit(1) },
        { name: 'Support Tickets', q: supabase.from('support_tickets').select('id').limit(1) },
        { name: 'Support Messages', q: supabase.from('support_messages').select('id').limit(1) }
    ];

    for (const { name, q } of queries) {
        const { error } = await q;
        if (error) {
            console.error(`❌ ${name}: ${error.message} (${error.code})`);
        } else {
            console.log(`✅ ${name}: OK`);
        }
    }

    console.log('\n--- DETAILED DATA CHECK ---');

    // Check for problematic bookings (often cause of 500s due to invalid JSONB or missing relations)
    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select(`
            id,
            total_price,
            price_breakdown,
            client_id,
            instructor_id,
            slot_id
        `)
        .limit(10);

    if (bError) console.error('Bookings Fetch Error:', bError);
    else {
        bookings.forEach(b => {
            if (typeof b.price_breakdown !== 'object') {
                console.warn(`⚠️ Booking ${b.id} has invalid price_breakdown:`, b.price_breakdown);
            }
        });
    }

    // Check if check_is_admin() exists and works for the specific user
    const adminId = '0ac887a7-c397-4529-aca6-9fb36165e3fa';
    const { data: isAdmin, error: rpcError } = await supabase.rpc('check_is_admin', { uid: adminId });
    if (rpcError) {
        console.warn('⚠️ check_is_admin RPC returned error (Note: it might not take arguments):', rpcError.message);
        // Try without arguments
        const { data: isAdminNoArg, error: rpcError2 } = await supabase.rpc('check_is_admin');
        if (rpcError2) console.error('❌ check_is_admin (NoArgs) failed:', rpcError2.message);
        else console.log('✅ check_is_admin (NoArgs) exists.');
    } else {
        console.log('✅ check_is_admin(uid) works. Result:', isAdmin);
    }
}

comprehensiveCheck();
