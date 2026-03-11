const { createClient } = require('@supabase/supabase-js');
const { format, addHours, parse, isBefore, isAfter } = require('date-fns');

const SUPABASE_URL = 'https://wzacmyemiljzpdskyvie.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function splitIntoHourlySlots(availability) {
    const hourlySlots = [];
    availability.forEach(slot => {
        const start = parse(slot.start_time, 'HH:mm:ss', new Date());
        const end = parse(slot.end_time, 'HH:mm:ss', new Date());
        let current = start;
        while (isBefore(current, end)) {
            const next = addHours(current, 1);
            if (isAfter(next, end)) break;
            hourlySlots.push({
                ...slot,
                start_time: format(current, 'HH:mm:ss'),
                end_time: format(next, 'HH:mm:ss'),
            });
            current = next;
        }
    });
    return hourlySlots;
}

async function run() {
    const id = 'f88938fc-eaa0-491a-8283-2972da96e24b';
    const today = '2026-03-11';
    // Current time fixed for simulation: 10:44 AM Manila
    const nowManilaTime = '10:14'; // nowMinus30Shift

    console.log(`Emulating logic for ${today} at approx 10:44 AM...`);

    const { data: availability } = await supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', id)
        .eq('date', today);

    const { data: bookings } = await supabase
        .from('bookings')
        .select('*, slots!inner(*)')
        .eq('instructor_id', id)
        .eq('slots.date', today);

    const bookedSlotsSet = new Set(bookings.map(b => `${b.slots.date}|${b.slots.start_time}`));

    const processed = splitIntoHourlySlots(availability || []);
    console.log(`Split into ${processed.length} hourly slots.`);

    const visible = processed.filter(a => {
        const notExpired = a.end_time.slice(0, 5) > nowManilaTime;
        const notBooked = !bookedSlotsSet.has(`${today}|${a.start_time}`);
        return notExpired && notBooked;
    });

    console.log(`Visible slots: ${visible.length}`);
    visible.forEach(v => {
        console.log(`- ${v.start_time} to ${v.end_time} at ${v.location_area}`);
    });
}

run();
