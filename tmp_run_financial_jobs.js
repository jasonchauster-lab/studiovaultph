const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
    console.error("Could not find Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
    console.log("Starting manual trigger for financial jobs...");

    // 1. Auto Complete Bookings
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() + 1);

    const { data: pastBookings, error } = await supabase
        .from('bookings')
        .select(`id, status, slots:slot_id(date, end_time)`)
        .in('status', ['approved', 'cancelled_charged'])
        .lte('slots.date', dateLimit.toISOString().split('T')[0]);

    if (error) {
        console.error("Error fetching past bookings:", error);
        return;
    }

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 1);

    const toComplete = pastBookings.filter(b => {
        if (!b.slots) return false;
        const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots;
        if (!slot.date || !slot.end_time) return false;
        const slotDate = new Date(`${slot.date}T${slot.end_time}+08:00`);
        return slotDate <= cutoffTime;
    });

    console.log(`Found ${toComplete.length} bookings to auto-complete.`);

    let completedCount = 0;
    for (const b of toComplete) {
        if (b.status === 'cancelled_charged') {
            console.log(`Processing instant payout for cancelled_charged booking ${b.id}...`);
            const { data: success, error: rpcError } = await supabase.rpc('process_instant_payout_atomic', {
                target_booking_id: b.id
            });
            if (success) completedCount++;
            else console.error(`Failed to instant payout booking ${b.id}:`, rpcError);
        } else {
            const { data: success, error: rpcError } = await supabase.rpc('process_booking_completion_atomic', {
                target_booking_id: b.id
            });
            if (success) completedCount++;
            else console.error(`Failed to complete booking ${b.id}:`, rpcError);
        }
    }
    console.log(`Successfully completed ${completedCount} bookings.`);

    // 2. Unlock Matured Funds
    const holdTime = new Date();
    holdTime.setHours(holdTime.getHours() - 24);

    const { data: maturedBookings, error: matureError } = await supabase
        .from('bookings')
        .select('id')
        .eq('status', 'completed')
        .eq('funds_unlocked', false)
        .lte('completed_at', holdTime.toISOString());

    if (matureError) {
        console.error("Error fetching matured bookings:", matureError);
        return;
    }

    console.log(`Found ${maturedBookings.length} bookings ready for funds unlock.`);

    let unlockedCount = 0;
    for (const b of maturedBookings) {
        const { data: success, error: unlockError } = await supabase.rpc('unlock_booking_funds_atomic', {
            target_booking_id: b.id
        });
        if (success) unlockedCount++;
        else console.error(`Failed to unlock funds for ${b.id}:`, unlockError);
    }

    console.log(`Successfully unlocked funds for ${unlockedCount} bookings.`);
}

run();
