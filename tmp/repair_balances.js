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

async function repairBalances() {
    const studioOwnerId = '909c5932-4410-415e-8743-26d5f3b4d8d4';
    const instructorId = 'f88938fc-eaa0-491a-8283-2972da96e24b';
    const amountToTransfer = 500;

    console.log("--- REPAIRING BALANCES ---");

    // 1. Move the 500
    console.log(`Transferring ${amountToTransfer} from Studio Owner to Instructor...`);
    const { error: tError } = await supabase.rpc('transfer_balance', {
        p_from_id: studioOwnerId,
        p_to_id: instructorId,
        p_amount: amountToTransfer
    });

    if (tError) {
        console.error("Transfer error:", tError);
    } else {
        console.log("Transfer successful.");
    }

    // 2. Revert the previous -1/+1 test
    console.log("Reverting the previous ₱1 test transfer...");
    const { error: rError } = await supabase.rpc('transfer_balance', {
        p_from_id: instructorId, // From instructor back to studio owner
        p_to_id: studioOwnerId,
        p_amount: 1
    });

    if (rError) {
        console.error("Revert error:", rError);
    } else {
        console.log("Revert successful.");
    }

    console.log("\n--- FINAL STATE CHECK ---");
    const { data: finalProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, available_balance, wallet_balance')
        .in('id', [studioOwnerId, instructorId]);

    console.log(JSON.stringify(finalProfiles, null, 2));
}

repairBalances();
