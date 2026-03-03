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

async function find500() {
    console.log("--- SEARCHING FOR ANY 500 TRANSACTIONS ---");
    const { data, error } = await supabase
        .from('wallet_top_ups')
        .select('*, profiles(full_name)')
        .eq('amount', 500);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${data.length} transactions of 500.`);
        console.log(JSON.stringify(data, null, 2));
    }
}

find500();
