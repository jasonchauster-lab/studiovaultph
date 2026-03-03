
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

async function findBookingAndSlot() {
    console.log('--- Finding Booking and Slot ---');

    // 1. Get the customer ID first
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'jchau199@gmail.com')
        .single();

    if (!profile) {
        console.log('Customer not found');
        return;
    }

    console.log(`Customer ID: ${profile.id}`);

    // 2. Get the latest bookings for this customer
    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select(`
            id, status, payment_status, slot_id,
            slots (
                id, date, start_time, is_available, equipment, quantity
            )
        `)
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false });

    if (bError) {
        console.error('Error fetching bookings:', bError);
    } else {
        console.log(`Found ${bookings.length} bookings.`);
        bookings.forEach(b => {
            console.log(`\nBooking ID: ${b.id}`);
            console.log(`Status: ${b.status}`);
            console.log(`Payment Status: ${b.payment_status}`);
            console.log(`Slot ID: ${b.slot_id}`);
            if (b.slots) {
                console.log(`Slot Details: Date=${b.slots.date}, Time=${b.slots.start_time}, IsAvailable=${b.slots.is_available}`);
                console.log(`Equipment: ${JSON.stringify(b.slots.equipment)}`);
                console.log(`Quantity: ${b.slots.quantity}`);
            } else {
                console.log(`Slot details NOT found for ID: ${b.slot_id}`);
            }
        });
    }
}

findBookingAndSlot();
