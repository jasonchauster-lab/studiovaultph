const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkBookings() {
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
    const ownerEmail = 'clubpilatesph@gmail.com';

    // 1. Get owner's studio
    const { data: ownerProfile } = await supabase.from('profiles').select('id').eq('email', ownerEmail).single();
    const { data: studio } = await supabase.from('studios').select('id').eq('owner_id', ownerProfile.id).single();
    
    // 2. Get customer profile
    const { data: customerProfile } = await supabase.from('profiles').select('id').eq('email', email).single();
    
    console.log(`Checking bookings for Customer ${email} (${customerProfile.id}) at Studio ${studio.id}`);

    // 3. Check bookings
    const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', customerProfile.id)
        .eq('studio_id', studio.id);

    console.log(`Found ${bookings?.length || 0} bookings.`);
    if (bookings?.length > 0) {
        console.log(JSON.stringify(bookings, null, 2));
    }
}

checkBookings();
