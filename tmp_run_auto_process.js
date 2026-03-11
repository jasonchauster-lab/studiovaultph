const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Mock next/headers for lib/wallet.ts
require('next/headers').cookies = async () => ({
    getAll: () => []
});

// Since lib/wallet.ts uses createClient from ./supabase/server which expects Next.js environment,
// and we are running in a node environment, we need to carefully handle the imports or mock.
// Actually, it's easier to just copy the core logic or use the service role client directly.

const envFile = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
        env[key.trim()] = value.join('=').trim();
    }
});

// Redefine the function here to avoid Next.js module issues in node
async function runAutoProcess() {
    const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Starting manual auto-process script...');

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 1);
    console.log(`Cutoff Time (1 hour ago): ${cutoffTime.toISOString()}`);

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() + 1);
    const dateLimitStr = dateLimit.toISOString().split('T')[0];

    const { data: pastBookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slots!inner(date, end_time)
        `)
        .or('status.eq.approved,status.eq.cancelled_charged')
        .lte('slots.date', dateLimitStr);

    if (error) {
        console.error('Error fetching bookings:', error);
        return;
    }

    if (!pastBookings || pastBookings.length === 0) {
        console.log('No bookings found to process.');
        return;
    }

    const toComplete = pastBookings.filter(b => {
        if (!b.slots) return false;
        const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots;
        if (!slot.date || !slot.end_time) return false;

        const slotDate = new Date(`${slot.date}T${slot.end_time}+08:00`);
        return slotDate <= cutoffTime;
    });

    console.log(`Found ${toComplete.length} bookings eligible for completion.`);

    if (toComplete.length === 0) return;

    let count = 0;
    for (const b of toComplete) {
        console.log(`Processing booking ${b.id} (${b.status})...`);

        let success = false;
        if (b.status === 'cancelled_charged') {
            const { data } = await supabase.rpc('process_instant_payout_atomic', {
                target_booking_id: b.id
            });
            success = !!data;
        } else {
            const { data } = await supabase.rpc('process_booking_completion_atomic', {
                target_booking_id: b.id
            });
            success = !!data;
        }

        if (success) {
            console.log(`  Successfully processed ${b.id}`);
            count++;
        } else {
            console.log(`  Failed to process ${b.id}`);
        }
    }

    console.log(`\nFinished. Processed ${count} bookings.`);
}

runAutoProcess();
