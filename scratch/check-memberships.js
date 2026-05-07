const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkMemberships() {
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
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
    
    console.log(`Checking memberships for ${email} (${profile.id})`);

    const { data: memberships } = await supabase
        .from('customer_memberships')
        .select('*, studios(name)')
        .eq('user_id', profile.id);

    console.log(JSON.stringify(memberships, null, 2));
}

checkMemberships();
