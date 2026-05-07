const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testEnsureMembership() {
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

    // Test data
    const email = 'jchau199@gmail.com';
    const studioId = 'e6a2d39e-b888-4b84-9c6d-5711a62c9920';

    const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
    const userId = profile.id;

    console.log(`Testing ensureStudioMembership for ${email} (${userId}) at Studio ${studioId}`);

    // Simulate the function logic (since I can't easily import from server action file in a node script without transpilation)
    
    // 1. customer_memberships
    const { error: memError } = await supabase
        .from('customer_memberships')
        .upsert({
            user_id: userId,
            studio_id: studioId,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, studio_id' });

    if (memError) console.error("Membership error:", memError);
    else console.log("Membership upserted successfully.");

    // 2. studio_customers
    const { error: custError } = await supabase
        .from('studio_customers')
        .upsert({
            studio_id: studioId,
            profile_id: userId,
            created_at: new Date().toISOString()
        }, { onConflict: 'studio_id, profile_id' });

    if (custError) console.error("Customer link error:", custError);
    else console.log("Customer link upserted successfully.");

    // Final check
    const { data: memCheck } = await supabase.from('customer_memberships').select('*').eq('user_id', userId).eq('studio_id', studioId).single();
    const { data: custCheck } = await supabase.from('studio_customers').select('*').eq('profile_id', userId).eq('studio_id', studioId).single();

    console.log("Verification results:");
    console.log("- Membership record exists:", !!memCheck);
    console.log("- CRM record exists:", !!custCheck);
}

testEnsureMembership();
