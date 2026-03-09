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
    console.log("Fetching bookings...");
    const { data, error } = await supabase
        .from('bookings')
        .select(`
            id, 
            status, 
            slots:slot_id(date, end_time)
        `)
        .in('status', ['approved', 'cancelled_charged']);

    if (error) {
        console.error("Error fetching bookings:", error);
        return;
    }

    console.log('Total approved/cancelled_charged bookings:', data.length);

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 1);

    let countToComplete = 0;

    const toComplete = data.filter(b => {
        if (!b.slots) return false;
        const slotTime = Array.isArray(b.slots) ? b.slots[0] : b.slots;
        if (!slotTime.date || !slotTime.end_time) return false;

        const slotDate = new Date(`${slotTime.date}T${slotTime.end_time}+08:00`);
        return slotDate <= cutoffTime;
    });

    console.log(`\nFound ${toComplete.length} bookings to auto-complete (past cutoff ${cutoffTime.toISOString()}):\n`);
    toComplete.forEach(b => {
        const slotTime = Array.isArray(b.slots) ? b.slots[0] : b.slots;
        console.log(`- Booking ${b.id.slice(0, 8)}: slot ${slotTime.date} ${slotTime.end_time}`);
    });
}

run();
