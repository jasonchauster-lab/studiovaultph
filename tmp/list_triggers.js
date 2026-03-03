const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
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

async function listTriggers() {
    const { data, error } = await supabase.rpc('query_db', {
        query: `
            SELECT 
                trigger_name, 
                event_manipulation, 
                action_statement, 
                action_timing
            FROM information_schema.triggers
            WHERE event_object_table = 'profiles';
        `
    });

    if (error) {
        // If query_db RPC doesn't exist, try a different approach or check if we can run it via a temp function
        console.error("Error listing triggers (query_db might not exist):", error);

        // Let's try to just check the migrations for anything that might look like a sync trigger
    } else {
        console.log("Triggers on profiles:", JSON.stringify(data, null, 2));
    }
}

listTriggers();
