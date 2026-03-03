
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSlotLock() {
    console.log('--- Checking Slot and Booking Status ---');

    // Slot ID and Booking ID from previous results
    const slotId = '926bb4f1-615f-4a69-8f3b-5544d6a4e32a';
    const bookingId = '3cc7d783-b63a-4b35-8530-b8a14dd12331';

    // 1. Check Slot status
    const { data: slot, error: slotError } = await supabase
        .from('slots')
        .select('*')
        .eq('id', slotId)
        .single();

    if (slotError) {
        console.error('Error fetching slot:', slotError);
    } else {
        console.log('\nSlot Details:');
        console.log(`- ID: ${slot.id}`);
        console.log(`- Date: ${slot.date}`);
        console.log(`- Time: ${slot.start_time} - ${slot.end_time}`);
        console.log(`- Is Booked: ${slot.is_booked}`);
        console.log(`- Status: ${slot.status}`);
        console.log(`- Equipment: ${JSON.stringify(slot.equipment)}`);
        console.log(`- Instructor ID: ${slot.instructor_id}`);
        console.log(`- Studio ID: ${slot.studio_id}`);
    }

    // 2. Check Bookings for this slot
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, client_id, instructor_id, payment_status')
        .eq('slot_id', slotId);

    if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
    } else {
        console.log('\nBookings for this slot:');
        bookings.forEach(b => {
            console.log(`- Booking ID: ${b.id}`);
            console.log(`  Status: ${b.status}`);
            console.log(`  Payment Status: ${b.payment_status}`);
            console.log(`  Client ID: ${b.client_id}`);
            console.log(`  Instructor ID: ${b.instructor_id}`);
        });
    }

    // 3. Logic check for locking:
    if (slot && slot.is_booked) {
        console.log('\nVERIFICATION: Slot is marked as is_booked=true. This prevents other customers from booking it.');
    } else {
        console.log('\nWARNING: Slot is NOT marked as is_booked=true.');
    }

    if (slot && slot.status === 'confirmed') {
        console.log('VERIFICATION: Slot status is "confirmed", meaning it is removed from lists.');
    }

    // Check if equipment is exhausted
    const isExhausted = slot && slot.equipment ? Object.values(slot.equipment).every(q => q <= 0) : false;
    if (isExhausted) {
        console.log('VERIFICATION: Equipment count is 0, preventing further bookings for this specific slot.');
    }
}

checkSlotLock();
