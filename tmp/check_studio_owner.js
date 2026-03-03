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

async function checkStudioOwner() {
    console.log("--- FINDING STUDIO ---");
    const { data: studio } = await supabase
        .from('studios')
        .select('id, name, owner_id')
        .ilike('name', '%Clubpilates PH%')
        .single();

    if (!studio) {
        console.log("Studio not found");
        return;
    }
    console.log("Studio:", studio);

    console.log("\n--- FINDING OWNER PROFILE ---");
    const { data: owner } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studio.owner_id)
        .single();

    console.log("Owner Profile:", owner);

    console.log("\n--- RECENT BOOKINGS FOR THIS STUDIO ---");
    const { data: bookings } = await supabase
        .from('bookings')
        .select('*, slots!inner(*)')
        .eq('slots.studio_id', studio.id)
        .order('created_at', { ascending: false })
        .limit(10);

    bookings.forEach(b => {
        if (b.status.includes('cancelled')) {
            console.log(`Booking ID: ${b.id}, Status: ${b.status}, Penalty Check:`, b.price_breakdown);
        }
    });

}

checkStudioOwner();
