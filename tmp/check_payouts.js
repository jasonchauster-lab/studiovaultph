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

async function checkPayouts() {
    const instructorId = 'f88938fc-eaa0-491a-8283-2972da96e24b';

    console.log("--- FETCHING PAYOUT REQUESTS ---");
    const { data: payouts, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching payouts:", error);
    } else {
        console.log(`Found ${payouts.length} payout requests.`);
        console.log(JSON.stringify(payouts, null, 2));
    }
}

checkPayouts();
