const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepVerification() {
    console.log("--- FINDING PROFLE ---");
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Timothy Kim%')
        .single();

    console.log("Profile:", profile);
    const userId = profile.id;

    console.log("\n--- FETCHING ALL BOOKINGS ---");
    const { data: allBookings } = await supabase
        .from('bookings')
        .select('*, slots(date, start_time, studios(name))')
        .eq('instructor_id', userId)
        .order('created_at', { ascending: false });

    console.log(`Found ${allBookings?.length || 0} bookings.`);
    allBookings?.forEach(b => {
        console.log(`ID: ${b.id}, Status: ${b.status}, Price: ${b.total_price}, Created: ${b.created_at}`);
        console.log(`Breakdown: ${JSON.stringify(b.price_breakdown)}`);
        console.log(`Slot: ${b.slots?.date} ${b.slots?.start_time} - ${b.slots?.studios?.name}`);
        console.log("-------------------");
    });

    console.log("\n--- FETCHING ALL WALLET TOP UPS / ADJUSTMENTS ---");
    const { data: walletActions } = await supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    console.log(`Found ${walletActions?.length || 0} wallet actions.`);
    walletActions?.forEach(wa => {
        console.log(JSON.stringify(wa, null, 2));
    });

    console.log("\n--- CHECKING IF ANY OTHER TIMOTHY KIMS EXIST ---");
    const { data: others } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .ilike('full_name', '%Timothy%');
    console.log("Other Timothy-like profiles:", others);
}

deepVerification();
