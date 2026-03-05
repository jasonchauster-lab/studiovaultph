const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local because dotenv might not be installed or configured
function getEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.join('=').trim();
        }
    });
    return env;
}

const env = getEnv();
const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepAudit() {
    console.log('--- ADMIN DASHBOARD DEEP AUDIT ---');

    // 1. Check if check_is_admin() exists
    const { data: hasFunction, error: funcError } = await supabase.rpc('check_is_admin');
    if (funcError) {
        console.warn('⚠️ check_is_admin() check failed. Error:', funcError.message);
    } else {
        console.log('✅ check_is_admin() is present and callable.');
    }

    // 2. Scan for recursive policies in pg_policies
    // Since we can't use exec_sql easily, we'll check if we can query pg_catalog.pg_policies
    // Actually, we can usually do this via a raw query if the service role has permissions.
    // However, if we can't, we'll check individual counts and look for "missing" data that should be there.

    const tables = [
        'profiles', 'bookings', 'slots', 'studios',
        'wallet_top_ups', 'payout_requests', 'admin_activity_logs',
        'support_tickets', 'support_messages'
    ];

    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
        if (error) {
            console.error(`❌ Table [${table}] Error:`, error.message);
        } else {
            console.log(`✅ Table [${table}] Count:`, count);
        }
    }

    // 3. Inspect the admin profile specifically
    const adminEmail = 'jasonchauster@gmail.com';
    const { data: adminProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', adminEmail)
        .single();

    if (profileError) {
        console.error('❌ Admin Profile Fetch Error:', profileError.message);
    } else {
        console.log('✅ Admin Profile found:', adminProfile.id, 'Role:', adminProfile.role);
        if (adminProfile.role !== 'admin') {
            console.warn('⚠️ Admin email does not have admin role!');
        }
    }

    // 4. Try to simulate a join that failed in the app
    console.log('\n--- JOIN SIMULATION ---');
    const { data: joinData, error: joinError } = await supabase
        .from('bookings')
        .select('id, slots!inner(id, studios(id, name))')
        .limit(1);

    if (joinError) {
        console.error('❌ Join Query Failed:', joinError.message);
    } else {
        console.log('✅ Join Query Successful.');
    }

    // 5. Check Activity Logs Join
    const { data: logData, error: logError } = await supabase
        .from('admin_activity_logs')
        .select('*, admin:profiles(full_name)')
        .limit(1);

    if (logError) {
        console.error('❌ Activity Logs Join Failed:', logError.message);
    } else {
        console.log('✅ Activity Logs Join Successful.');
    }
}

deepAudit();
