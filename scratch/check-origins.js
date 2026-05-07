const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkOrigins() {
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

    const { data: counts } = await supabase
        .from('profiles')
        .select('origin_portal');

    const summary = {};
    counts.forEach(c => {
        summary[c.origin_portal] = (summary[c.origin_portal] || 0) + 1;
    });

    console.log(JSON.stringify(summary, null, 2));
}

checkOrigins();
