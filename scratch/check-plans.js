const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkPlans() {
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
    
    console.log(`Checking plans for Customer ${email} (${customerProfile.id})`);

    const { data: plans } = await supabase.from('customer_plans').select('*, studios(name), packages(name)').eq('user_id', customerProfile.id);

    console.log(`Found ${plans?.length || 0} plans.`);
    plans?.forEach(p => console.log(`- Plan: ${p.packages?.name || p.memberships?.name} | Status: ${p.status} | Amount: ${p.total_amount} | Method: ${p.payment_method}`));
}

checkPlans();
