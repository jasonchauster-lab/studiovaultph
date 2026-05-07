const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkAllBookings() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
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

    const email = 'jadenphan4@gmail.com';
    const { data: customerProfile } = await supabase.from('profiles').select('id').eq('email', email).single();
    
    console.log(`Checking ALL bookings for Customer ${email} (${customerProfile.id})`);

    const { data: bookings } = await supabase
        .from('bookings')
        .select('*, slots(*, studios(name))')
        .eq('client_id', customerProfile.id);

    console.log(`Found ${bookings?.length || 0} total bookings across all studios.`);
    if (bookings?.length > 0) {
        bookings.forEach(b => {
            console.log(`- Studio: ${b.slots?.studios?.name} | Status: ${b.status} | Date: ${b.booking_date}`);
        });
    }
}

checkAllBookings();
