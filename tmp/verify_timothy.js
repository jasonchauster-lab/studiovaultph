const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
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

async function verifyTimothyData() {
    console.log("--- FINDING PROFILE ---");
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, available_balance, pending_balance, wallet_balance')
        .ilike('full_name', '%Timothy Kim%')
        .single();

    if (pError || !profile) {
        console.error("Error finding profile:", pError);
        return;
    }

    console.log("Profile Found:", profile);

    const instructorId = profile.id;

    console.log("\n--- RECENT BOOKINGS ---");
    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select('id, status, total_price, price_breakdown, payment_status, created_at, slots(date, start_time)')
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (bError) {
        console.error("Error fetching bookings:", bError);
    } else {
        console.log("Bookings:", JSON.stringify(bookings, null, 2));
    }

    console.log("\n--- WALLET ADJUSTMENTS ---");
    const { data: adjustments, error: aError } = await supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('user_id', instructorId)
        .order('created_at', { ascending: false });

    if (aError) {
        console.error("Error fetching adjustments:", aError);
    } else {
        console.log("Adjustments:", JSON.stringify(adjustments, null, 2));
    }
}

verifyTimothyData();
