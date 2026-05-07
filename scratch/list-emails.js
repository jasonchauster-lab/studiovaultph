const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function listEmails() {
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

    const { data: links } = await supabase
        .from('studio_customers')
        .select('profiles(email)')
        .eq('studio_id', studio.id);

    console.log("Customers linked to studio:");
    links?.forEach(l => console.log(`- ${l.profiles?.email}`));
}

listEmails();
