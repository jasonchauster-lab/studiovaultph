const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    console.log('Searching for Jeffrey or Emma...');
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or('full_name.ilike.%Jeffrey%,full_name.ilike.%Emma%');

    if (pError) {
        console.error('Error fetching profiles:', pError);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('No profile found');
        return;
    }

    for (const p of profiles) {
        console.log(`\n--- Profile: ${p.full_name} (${p.id}) ---`);
        const { data: bks, error: bError } = await supabase
            .from('bookings')
            .select('id, status, created_at, total_price, price_breakdown')
            .eq('client_id', p.id)
            .order('created_at', { ascending: false });

        if (bError) {
            console.error(`Error fetching bookings for ${p.id}:`, bError);
            continue;
        }

        console.log('Bookings:');
        console.table(bks.map(b => ({
            id: b.id.slice(0, 8),
            status: b.status,
            created: b.created_at,
            total: b.total_price,
            deduction: (b.price_breakdown)?.wallet_deduction
        })));

        const { data: tx, error: tError } = await supabase
            .from('wallet_top_ups')
            .select('*')
            .eq('user_id', p.id)
            .order('created_at', { ascending: false });

        if (tError) {
            console.error(`Error fetching wallet_top_ups for ${p.id}:`, tError);
            continue;
        }

        console.log('Wallet Actions (top_ups/refunds):');
        console.table(tx.map(t => ({
            id: t.id.slice(0, 8),
            type: t.type,
            amount: t.amount,
            status: t.status,
            created: t.created_at
        })));
    }
}

check();
