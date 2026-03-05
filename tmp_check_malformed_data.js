const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.join('=').trim();
        }
    });
    return env;
}

const env = getEnv();
const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPendingBookings() {
    console.log('--- CHECKING PENDING BOOKINGS FOR MALFORMED DATA ---');

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*, slots(date, start_time)')
        .eq('status', 'pending');

    if (error) {
        console.error('Error fetching bookings:', error);
        return;
    }

    console.log(`Found ${bookings.length} pending bookings.`);

    bookings.forEach(b => {
        const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots;
        if (!slot) {
            console.warn(`⚠️ Booking ${b.id} has NO SLOT!`);
        } else if (!slot.date || !slot.start_time) {
            console.warn(`⚠️ Booking ${b.id} has slot with partial data: Date=${slot.date}, Time=${slot.start_time}`);
        } else {
            try {
                const combined = new Date(`${slot.date}T${slot.start_time}+08:00`);
                if (isNaN(combined.getTime())) {
                    console.error(`❌ Booking ${b.id} has INVALID combined date: ${slot.date}T${slot.start_time}`);
                } else {
                    combined.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
                }
            } catch (e) {
                console.error(`❌ Booking ${b.id} TRIGGERS RangeError: ${e.message}`);
            }
        }
    });

    console.log('\n--- CHECKING ALL USERS FOR MALFORMED DATA ---');
    const { data: users, error: uError } = await supabase
        .from('profiles')
        .select('id, full_name, waiver_signed_at, created_at');

    if (uError) {
        console.error('Error fetching users:', uError);
        return;
    }

    users.forEach(u => {
        if (u.waiver_signed_at) {
            try {
                const d = new Date(u.waiver_signed_at);
                if (isNaN(d.getTime())) {
                    console.error(`❌ User ${u.id} (${u.full_name}) has INVALID waiver_signed_at: ${u.waiver_signed_at}`);
                }
            } catch (e) {
                console.error(`❌ User ${u.id} TRIGGERS error for waiver_signed_at: ${e.message}`);
            }
        }
    });
}

checkPendingBookings();
