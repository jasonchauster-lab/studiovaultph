const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkRecentCustomers() {
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

    const ownerEmail = 'clubpilatesph@gmail.com';
    const { data: ownerProfile } = await supabase.from('profiles').select('id').eq('email', ownerEmail).single();
    const { data: studio } = await supabase.from('studios').select('id').eq('owner_id', ownerProfile.id).single();

    console.log(`Listing recent customers for Studio ${studio.id}`);

    const { data: recentCustomers } = await supabase
        .from('studio_customers')
        .select('*, profiles(email, full_name)')
        .eq('studio_id', studio.id)
        .order('created_at', { ascending: false })
        .limit(10);

    console.log(JSON.stringify(recentCustomers, null, 2));
}

checkRecentCustomers();
