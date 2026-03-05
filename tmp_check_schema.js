const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const tables = ['bookings', 'slots', 'profiles', 'payout_requests', 'certifications', 'studios'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`\nTable ${table} columns:`);
            console.log(Object.keys(data[0]).join(', '));
        } else {
            console.log(`\nTable ${table} is empty but structure should be accessible via rpc if needed, or by selecting 0 rows`);
            const res = await supabase.from(table).select('*').limit(0)
            if (res.data) console.log(`Table ${table} columns (from empty set):`, Object.keys(res.data[0] || {}))
        }
    }
}

checkSchema();
