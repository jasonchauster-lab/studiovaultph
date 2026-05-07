const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function listRecentUsers() {
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

    console.log("--- Listing 5 Recent Users ---");
    const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
    
    if (uError) {
        console.error("Error listing users:", uError.message);
        return;
    }

    // Sort by created_at desc
    const recent = users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    
    for (const user of recent) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
        console.log(`User: ${user.email} | ID: ${user.id} | Created: ${user.created_at} | Profile: ${profile ? 'Yes' : 'No'}`);
    }
}

listRecentUsers();
