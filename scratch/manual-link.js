const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function linkCustomer() {
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
    const studioId = 'e6a2d39e-b888-4b84-9c6d-5711a62c9920'; // Clubpilatesph

    console.log(`Linking ${email} to studio ${studioId}`);

    // 1. Find profile
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', email.toLowerCase()).single();
    if (!profile) {
        console.error("Profile not found");
        return;
    }

    // 2. Upsert studio_customers
    const { error } = await supabase
        .from('studio_customers')
        .upsert({
            studio_id: studioId,
            profile_id: profile.id,
            created_at: new Date().toISOString()
        }, {
            onConflict: 'studio_id,profile_id'
        });

    if (error) {
        console.error("Upsert failed:", error);
    } else {
        console.log("SUCCESS: Customer linked to studio.");
    }
}

linkCustomer();
