const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.trim().startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

async function run() {
    console.log('--- Inspecting Slots Table Schema ---');
    const res = await fetch(`${supabaseUrl}/rest/v1/slots?limit=1`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const data = await res.json();
    if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
        console.log('Has is_deleted:', Object.keys(data[0]).includes('is_deleted'));
    } else {
        console.log('No rows found in slots or error occurred.');
        console.log('Response:', JSON.stringify(data));
    }
}

run().catch(console.error);
