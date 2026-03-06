const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
    console.log('--- RUNNING DASHBOARD QUERY DIAGNOSTICS ---');

    const queries = [
        { name: '1. Certs', q: supabase.from('certifications').select('*, profiles(full_name, contact_number, tin, gov_id_url, gov_id_expiry, bir_url)').eq('verified', false) },
        { name: '2. Studios', q: supabase.from('studios').select('*, profiles(full_name)').eq('verified', false) },
        { name: '3. Payout Setup', q: supabase.from('studios').select('id, name, mayors_permit_url, secretary_certificate_url, mayors_permit_expiry, secretary_certificate_expiry, bir_certificate_url, bir_certificate_expiry, insurance_url, insurance_expiry, created_at, profiles(full_name)').eq('payout_approval_status', 'pending') },
        { name: '4. Bookings', q: supabase.from('bookings').select('*, client:profiles!client_id(full_name), instructor:profiles!instructor_id(full_name), slots(date, start_time, end_time, studios(name, location, address))').eq('status', 'pending') },
        { name: '5. Instructor Payouts', q: supabase.from('payout_requests').select('*, instructor:profiles!instructor_id(id, full_name, email)').eq('status', 'pending').not('instructor_id', 'is', null) },
        { name: '6. Studio Payouts', q: supabase.from('payout_requests').select('*, studios(name, profiles(full_name))').eq('status', 'pending').not('studio_id', 'is', null) },
        { name: '7. Customer Payouts', q: supabase.from('payout_requests').select('*, profile:profiles!user_id(id, full_name, role, email)').eq('status', 'pending').not('user_id', 'is', null).is('instructor_id', null).is('studio_id', null) },
        { name: '8. Wallet Top-Ups', q: supabase.from('wallet_top_ups').select('*, profiles:profiles!user_id(full_name, email, role)').eq('status', 'pending').eq('type', 'top_up') },
        { name: '9. Suspended Studios', q: supabase.from('profiles').select('id, full_name, email, is_suspended, studios(id, name)').eq('is_suspended', true) },
        { name: '10. Negative Balances', q: supabase.from('profiles').select('id, full_name, email, available_balance').eq('role', 'instructor').lt('available_balance', 0) },
        { name: '11. Activity Logs', q: supabase.from('admin_activity_logs').select('id, action_type, entity_type, entity_id, details, created_at, admin:profiles!admin_id(full_name, email)').order('created_at', { ascending: false }).limit(500) },
        { name: '12. All Users', q: supabase.from('profiles').select('id, full_name, email, role, created_at, available_balance, is_suspended, contact_number, waiver_url, waiver_signed_at').order('created_at', { ascending: false }) }
    ];

    for (const item of queries) {
        console.log(`Running ${item.name}...`);
        const start = Date.now();
        try {
            const { data, error } = await item.q;
            const duration = Date.now() - start;
            if (error) {
                console.error(`FAILED: ${item.name}: ${error.message} (${duration}ms)`);
            } else {
                console.log(`SUCCESS: ${item.name}: ${data?.length ?? 0} rows (${duration}ms)`);
            }
        } catch (e) {
            console.error(`CRASHED: ${item.name}: ${e.message}`);
        }
    }
}

runDiagnostics();
