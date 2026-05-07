const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testInsert() {
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

    console.log("--- Finding Orphaned Users ---");
    const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
    
    if (uError) {
        console.error("Error listing users:", uError.message);
        return;
    }

    if (users.length === 0) {
        console.log("No users found.");
        return;
    }

    // Find a user without a profile
    for (const user of users) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (!profile) {
            console.log(`Found orphaned user: ${user.email} (${user.id})`);
            console.log("Attempting to insert profile for this user...");
            
            const { error: iError } = await supabase.from('profiles').insert({
                id: user.id,
                email: user.email,
                full_name: 'Test Sync',
                role: 'customer'
            });

            if (iError) {
                console.error("Insert failed:", iError.message);
                console.error("Error details:", iError.details);
                console.error("Error hint:", iError.hint);
            } else {
                console.log("Insert succeeded!");
            }
            return;
        }
    }

    console.log("All users have profiles.");
}

testInsert();
