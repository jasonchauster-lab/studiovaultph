
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkEnum() {
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

    console.log("--- Checking user_role ENUM values ---");
    
    try {
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: "SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role'"
        });

        if (error) {
            console.error("Error fetching enum:", error.message);
        } else {
            console.log("Allowed roles:", data.map(d => d.enumlabel));
        }
    } catch (err) {
        console.error("Script error:", err.message);
    }
}

checkEnum();
