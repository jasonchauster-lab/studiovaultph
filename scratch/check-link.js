const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkLink() {
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

    console.log(`--- Checking Link for ${email} to ${ownerEmail}'s studio ---`);

    // 1. Get owner's studio
    const { data: ownerProfile } = await supabase.from('profiles').select('id').eq('email', ownerEmail).single();
    if (!ownerProfile) {
        console.error("Owner profile not found");
        return;
    }

    const { data: studio } = await supabase.from('studios').select('id, name').eq('owner_id', ownerProfile.id).single();
    if (!studio) {
        console.error("Studio not found for owner");
        return;
    }
    console.log(`Studio: ${studio.name} (${studio.id})`);

    // 2. Get customer profile
    const { data: customerProfile } = await supabase.from('profiles').select('id').eq('email', email).single();
    if (!customerProfile) {
        console.error("Customer profile not found");
        return;
    }
    console.log(`Customer Profile ID: ${customerProfile.id}`);

    // 3. Check studio_customers
    const { data: link } = await supabase
        .from('studio_customers')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('profile_id', customerProfile.id)
        .maybeSingle();

    if (link) {
        console.log("Customer IS linked to studio in studio_customers table.");
        console.log(JSON.stringify(link, null, 2));
    } else {
        console.log("Customer is NOT linked to studio in studio_customers table.");
    }
}

checkLink();
