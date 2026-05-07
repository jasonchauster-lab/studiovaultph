const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkUser(email) {
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

    console.log(`--- Checking User: ${email} ---`);
    const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
    
    const user = users.find(u => u.email === email);
    if (user) {
        console.log(`Found user: ${user.id} | Created: ${user.created_at}`);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        console.log(`Profile exists: ${!!profile}`);
    } else {
        console.log("User NOT found in auth.users.");
    }
}

checkUser('jadenphan4@gmail.com');
