const fs = require('fs');

async function run() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
        }
    });

    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await fetch(`${url}/rest/v1/`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
