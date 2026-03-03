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

async function checkCancelledBy() {
    const bookingId = '9012dd00-588a-425c-bb59-b0f984865747';
    const { data: b, error } = await supabase
        .from('bookings')
        .select('id, cancelled_by, instructor_id, status, price_breakdown')
        .eq('id', bookingId)
        .single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Booking Details:", b);

        const { data: canceller } = await supabase
            .from('profiles')
            .select('id, full_name, role, available_balance')
            .eq('id', b.cancelled_by)
            .single();

        console.log("Cancelled By Profile:", canceller);
    }
}

checkCancelledBy();
