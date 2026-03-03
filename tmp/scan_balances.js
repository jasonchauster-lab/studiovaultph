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

async function scanBalances() {
    console.log("--- SCANNING NON-ZERO BALANCES ---");
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, available_balance, wallet_balance, pending_balance')
        .or('available_balance.neq.0,wallet_balance.neq.0,pending_balance.neq.0');

    if (error) {
        console.error("Error scanning balances:", error);
    } else {
        console.log(`Found ${profiles.length} profiles with non-zero balances.`);
        console.log(JSON.stringify(profiles, null, 2));
    }
}

scanBalances();
