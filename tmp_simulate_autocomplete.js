const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function simulate() {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 1);
    console.log(`Cutoff Time (1 hour ago): ${cutoffTime.toISOString()}`);

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() + 1);
    const dateLimitStr = dateLimit.toISOString().split('T')[0];
    console.log(`Date Limit: ${dateLimitStr}`);

    console.log('Fetching past bookings...');
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

    console.log(`Found ${pastBookings?.length || 0} candidate bookings (approved or cancelled_charged).`);

    const toComplete = pastBookings.filter(b => {
        if (!b.slots) return false;
        const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots;
        if (!slot.date || !slot.end_time) return false;

        const slotDate = new Date(`${slot.date}T${slot.end_time}+08:00`);
        const eligible = slotDate <= cutoffTime;

        if (b.id === 'b9a7e6be-0a64-4a5c-be09-f47756b6f130' || b.id.startsWith('b9a7e6be')) {
            console.log(`Checking Jeffrey's booking ${b.id}:`);
            console.log(`  Slot Date: ${slot.date}, End Time: ${slot.end_time}`);
            console.log(`  Constructed slotDate (PH): ${slotDate.toISOString()}`);
            console.log(`  Eligible: ${eligible}`);
        }

        return eligible;
    });

    console.log(`Number of bookings eligible for completion: ${toComplete.length}`);
    if (toComplete.length > 0) {
        console.log('Eligible bookings:');
        console.table(toComplete.map(b => ({
            id: b.id,
            status: b.status,
            slot_date: (Array.isArray(b.slots) ? b.slots[0] : b.slots).date,
            slot_end: (Array.isArray(b.slots) ? b.slots[0] : b.slots).end_time
        })));
    }
}

simulate();
