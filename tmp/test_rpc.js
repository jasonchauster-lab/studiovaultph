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

async function testTransfer() {
    const fromId = '909c5932-4410-415e-8743-26d5f3b4d8d4'; // Studio Owner
    const toId = 'f88938fc-eaa0-491a-8283-2972da96e24b'; // Instructor

    console.log("--- BEFORE STATE ---");
    const { data: before } = await supabase
        .from('profiles')
        .select('id, available_balance, wallet_balance')
        .in('id', [fromId, toId]);
    console.log(before);

    console.log("\n--- TESTING RPC (1.00) ---");
    const { error } = await supabase.rpc('transfer_balance', {
        p_from_id: fromId,
        p_to_id: toId,
        p_amount: 1.00
    });

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success (presumably)");
    }

    console.log("\n--- AFTER STATE ---");
    const { data: after } = await supabase
        .from('profiles')
        .select('id, available_balance, wallet_balance')
        .in('id', [fromId, toId]);
    console.log(after);
}

testTransfer();
