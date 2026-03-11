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

async function check() {
    console.log('Searching for Jeffrey...');
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .ilike('full_name', '%Jeffrey%');

    if (pError) {
        console.error('Error fetching profiles:', pError);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('No profile found for Jeffrey');
        return;
    }

    console.log('Found Jeffreys:');
    console.table(profiles);

    const today = '2026-03-11';
    console.log(`\nChecking all slots for today (${today})...`);

    const { data: slots, error: sError } = await supabase
        .from('slots')
        .select('*')
        .eq('date', today)
        .order('start_time', { ascending: true });

    if (sError) {
        console.error('Error fetching slots:', sError);
        return;
    }

    if (!slots || slots.length === 0) {
        console.log('No slots found for today.');
    } else {
        console.log('Slots found today:');
        console.table(slots.map(s => ({
            id: s.id,
            start: s.start_time,
            end: s.end_time,
            status: s.status,
            instructor_id: s.instructor_id,
            studio_id: s.studio_id
        })));
    }

    // Also check bookings for today's slots
    if (slots && slots.length > 0) {
        const slotIds = slots.map(s => s.id);
        const { data: bookings, error: bError } = await supabase
            .from('bookings')
            .select(`
                id,
                slot_id,
                status,
                client_id
            `)
            .in('slot_id', slotIds);

        if (bError) {
            console.error('Error fetching bookings:', bError);
        } else {
            console.log('\nBookings for today\'s slots:');
            // Fetch client names manually since join might fail
            const clientIds = [...new Set(bookings.map(b => b.client_id))];
            const { data: clients } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', clientIds);

            const clientMap = (clients || []).reduce((acc, c) => {
                acc[c.id] = c.full_name;
                return acc;
            }, {});

            console.table(bookings.map(b => ({
                id: b.id,
                slot_id: b.slot_id,
                status: b.status,
                client: clientMap[b.client_id] || b.client_id
            })));
        }
    }

    // Check bookings where Jeffrey is the client
    const jeffreyId = '87cf6e4d-9057-431d-9db4-7c458c8728cb';
    console.log(`\nChecking bookings for Jeffrey Star (Client ID: ${jeffreyId})...`);
    const { data: jeffreyBookings, error: jbError } = await supabase
        .from('bookings')
        .select(`
            id,
            slot_id,
            status,
            created_at,
            slot:slot_id(date, start_time, end_time)
        `)
        .eq('client_id', jeffreyId)
        .order('created_at', { ascending: false });

    if (jbError) {
        console.error('Error fetching Jeffrey bookings:', jbError);
    } else {
        console.log('Jeffrey bookings:');
        console.table(jeffreyBookings.map(b => ({
            id: b.id.slice(0, 8),
            status: b.status,
            date: b.slot?.date,
            time: `${b.slot?.start_time} - ${b.slot?.end_time}`,
            created: b.created_at
        })));
    }
}

check();
